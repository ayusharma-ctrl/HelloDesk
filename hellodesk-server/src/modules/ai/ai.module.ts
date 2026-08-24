import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { EmbeddingService } from './embeddings/embedding.service.js';
import { ChunkingService } from './retrieval/chunking.service.js';
import { VectorStoreService } from './retrieval/vector-store.service.js';
import { ConfidenceEvaluator } from './retrieval/confidence-evaluator.js';
import { HybridRetrieverService } from './retrieval/hybrid-retriever.service.js';
import { PromptRegistryService } from './prompts/prompt-registry.service.js';
import { PiiMaskerService } from './safety/pii-masker.service.js';
import { InjectionDetectorService } from './safety/injection-detector.service.js';
import { OutputGuardrailsService } from './safety/output-guardrails.service.js';
import { HandoffService } from './agent/handoff.service.js';
import { ToolRegistryService } from './tools/tool-registry.service.js';
import { CustomToolService } from './tools/custom-tool.service.js';
import { SearchKbTool } from './tools/implementations/search-kb.tool.js';
import { GetCustomerProfileTool } from './tools/implementations/get-customer-profile.tool.js';
import { GetBillingInfoTool } from './tools/implementations/get-billing-info.tool.js';
import { CheckSystemStatusTool } from './tools/implementations/check-system-status.tool.js';
import { GetWorkspacePolicyTool } from './tools/implementations/get-workspace-policy.tool.js';
import { AssignToHumanAgentTool } from './tools/implementations/assign-to-human.tool.js';
import { SupervisorNode } from './agent/nodes/supervisor.node.js';
import { BillingSpecialistNode } from './agent/nodes/billing-specialist.node.js';
import { TechSpecialistNode } from './agent/nodes/tech-specialist.node.js';
import { QaReviewerNode } from './agent/nodes/qa-reviewer.node.js';
import { MultiAgentGraphBuilder } from './agent/multi-agent-graph.builder.js';
import { AgentRuntimeService } from './agent/agent-runtime.service.js';
import { EvaluationService } from './eval/evaluation.service.js';
import { CostAccountingService } from './cost/cost-accounting.service.js';
import { WhisperAdapterService } from './voice/stt/whisper-adapter.service.js';
import { PiperAdapterService } from './voice/tts/piper-adapter.service.js';
import { VoiceSessionService } from './voice/voice-session.service.js';
import { VoiceGateway } from './voice/voice.gateway.js';
import { VoiceController } from './voice/voice.controller.js';
import { AiController } from './ai.controller.js';

@Global()
@Module({
    imports: [PrismaModule],
    controllers: [AiController, VoiceController],
    providers: [
        EmbeddingService,
        ChunkingService,
        VectorStoreService,
        ConfidenceEvaluator,
        HybridRetrieverService,
        PromptRegistryService,
        PiiMaskerService,
        InjectionDetectorService,
        OutputGuardrailsService,
        HandoffService,
        SearchKbTool,
        GetCustomerProfileTool,
        GetBillingInfoTool,
        CheckSystemStatusTool,
        GetWorkspacePolicyTool,
        AssignToHumanAgentTool,
        CustomToolService,
        ToolRegistryService,
        SupervisorNode,
        BillingSpecialistNode,
        TechSpecialistNode,
        QaReviewerNode,
        MultiAgentGraphBuilder,
        AgentRuntimeService,
        EvaluationService,
        CostAccountingService,
        WhisperAdapterService,
        PiperAdapterService,
        VoiceSessionService,
        VoiceGateway,
    ],
    exports: [
        EmbeddingService,
        ChunkingService,
        VectorStoreService,
        ConfidenceEvaluator,
        HybridRetrieverService,
        PromptRegistryService,
        PiiMaskerService,
        InjectionDetectorService,
        OutputGuardrailsService,
        HandoffService,
        CustomToolService,
        ToolRegistryService,
        SupervisorNode,
        BillingSpecialistNode,
        TechSpecialistNode,
        QaReviewerNode,
        MultiAgentGraphBuilder,
        AgentRuntimeService,
        EvaluationService,
        CostAccountingService,
        WhisperAdapterService,
        PiperAdapterService,
        VoiceSessionService,
        VoiceGateway,
    ],
})
export class AiModule {}
