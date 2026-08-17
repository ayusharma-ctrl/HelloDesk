import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'src/app/widget-demo/widget.ts');
        const tsCode = fs.readFileSync(filePath, 'utf8');

        // Transpile target code to ES2020 client-side executable JS
        const result = ts.transpileModule(tsCode, {
            compilerOptions: {
                target: ts.ScriptTarget.ES2020,
                module: ts.ModuleKind.ESNext,
                removeComments: true,
            }
        });

        // Replace local/relative endpoint URLs based on request context if needed
        // (Default is localhost:3001, but can use absolute backend url in production)
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
        let jsCode = result.outputText;
        jsCode = jsCode.replace('http://localhost:3001', apiBaseUrl);

        return new NextResponse(jsCode, {
            headers: {
                'Content-Type': 'application/javascript; charset=utf-8',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
            },
        });
    } catch (error) {
        console.error('Failed to compile widget script:', error);
        return new NextResponse('console.error("HelloDesk widget build failure")', {
            status: 500,
            headers: { 'Content-Type': 'application/javascript' }
        });
    }
}
