import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { getChatModel, STRICT_SYSTEM_PROMPT } from "@/lib/langchain/config";
import { searchDocuments, formatContext } from "@/lib/langchain/vectorStore";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const dynamic = "force-dynamic";

// Note: WhatsApp messages via Twilio are sent as URL-encoded form data (application/x-www-form-urlencoded)
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const incomingMsg = formData.get("Body") as string;
        const fromNumber = formData.get("From") as string;

        console.log(`Received WhatsApp message from ${fromNumber}: ${incomingMsg}`);

        if (!incomingMsg) {
            return new NextResponse("No message body found", { status: 400 });
        }

        // 1. Search Knowledge Base (Pinecone or Memory)
        const relevantDocs = await searchDocuments(incomingMsg, 3);
        const context = formatContext(relevantDocs);

        // 2. Prepare AI Prompt
        const filledPrompt = STRICT_SYSTEM_PROMPT.replace("{context}", context).replace(
            "{question}",
            incomingMsg
        );

        // 3. Get AI Response
        const chatModel = getChatModel();
        const aiResponse = await chatModel.invoke([
            new SystemMessage(filledPrompt),
            new HumanMessage(incomingMsg),
        ]);

        const replyText = aiResponse.content.toString();

        // 4. Respond to Twilio with TwiML
        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message(replyText);

        return new NextResponse(twiml.toString(), {
            headers: {
                "Content-Type": "text/xml",
            },
        });
    } catch (error) {
        console.error("WhatsApp Webhook Error:", error);

        // Return a basic error message to the user via WhatsApp
        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message("I'm sorry, I'm having trouble processing your request right now. Please try again later.");

        return new NextResponse(twiml.toString(), {
            headers: {
                "Content-Type": "text/xml",
            },
        });
    }
}
