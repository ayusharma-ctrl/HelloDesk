import { Injectable, Inject } from '@nestjs/common';
import { StateGraph, END, START } from '@langchain/langgraph';
import { MultiAgentStateAnnotation, MultiAgentStateType } from './agent-state.interface.js';
import { SupervisorNode } from './nodes/supervisor.node.js';
import { BillingSpecialistNode } from './nodes/billing-specialist.node.js';
import { TechSpecialistNode } from './nodes/tech-specialist.node.js';
import { QaReviewerNode } from './nodes/qa-reviewer.node.js';
import { HandoffService } from './handoff.service.js';
import { logger } from '../../../lib/logger.js';

@Injectable()
export class MultiAgentGraphBuilder {
    private compiledGraph: any = null;

    constructor(
        @Inject(SupervisorNode) private readonly supervisorNode: SupervisorNode,
        @Inject(BillingSpecialistNode) private readonly billingSpecialistNode: BillingSpecialistNode,
        @Inject(TechSpecialistNode) private readonly techSpecialistNode: TechSpecialistNode,
        @Inject(QaReviewerNode) private readonly qaReviewerNode: QaReviewerNode,
        @Inject(HandoffService) private readonly handoffService: HandoffService
    ) {}

    /**
     * Build and compile the LangGraph Supervisor-Worker Multi-Agent Graph
     */
    getGraph() {
        if (this.compiledGraph) {
            return this.compiledGraph;
        }

        logger.info('Building LangGraph Supervisor-Worker Multi-Agent StateGraph...');

        const workflow = new StateGraph(MultiAgentStateAnnotation)
            // 1. Supervisor / Triage Agent Node
            .addNode('supervisor', async (state: MultiAgentStateType) => {
                return await this.supervisorNode.execute(state);
            })
            // 2. Billing Specialist Worker Agent Node
            .addNode('billing_specialist', async (state: MultiAgentStateType) => {
                return await this.billingSpecialistNode.execute(state);
            })
            // 3. Technical Support Specialist Worker Agent Node
            .addNode('tech_specialist', async (state: MultiAgentStateType) => {
                return await this.techSpecialistNode.execute(state);
            })
            // 4. Supervisor / QA Reviewer Agent Node
            .addNode('qa_reviewer', async (state: MultiAgentStateType) => {
                return await this.qaReviewerNode.execute(state);
            })
            // 5. Human Escalation / Handoff Node
            .addNode('human_handoff', async (state: MultiAgentStateType) => {
                try {
                    await this.handoffService.executeHandoff(
                        state.conversationId,
                        state.workspaceId,
                        state.supervisorReasoning || 'Supervisor triage detected requirement for human specialist.',
                        state.customerQuery
                    );
                } catch (e: any) {
                    logger.warn({ error: e.message }, 'Handoff trigger non-fatal exception');
                }

                return {
                    currentAgent: 'human_specialist',
                    finalResponse: 'I am connecting you with a human specialist right now. A team member will join this conversation shortly.',
                    isHandoffRequested: true,
                    agentTimeline: [
                        {
                            agent: 'Supervisor',
                            action: 'Transferred conversation to Human Specialist',
                            timestamp: Date.now()
                        }
                    ]
                };
            });

        // Wire START -> Supervisor
        workflow.addEdge(START, 'supervisor');

        // Wire Conditional Routing from Supervisor
        workflow.addConditionalEdges('supervisor', (state: MultiAgentStateType) => {
            if (state.agentRoute === 'billing') {
                return 'billing_specialist';
            }
            if (state.agentRoute === 'technical') {
                return 'tech_specialist';
            }
            if (state.agentRoute === 'handoff') {
                return 'human_handoff';
            }
            // General inquiries pass directly to QA review
            return 'qa_reviewer';
        });

        // Wire Worker Nodes -> QA Reviewer
        workflow.addEdge('billing_specialist', 'qa_reviewer');
        workflow.addEdge('tech_specialist', 'qa_reviewer');

        // Wire Final Outcomes -> END
        workflow.addEdge('qa_reviewer', END);
        workflow.addEdge('human_handoff', END);

        this.compiledGraph = workflow.compile();
        return this.compiledGraph;
    }
}
