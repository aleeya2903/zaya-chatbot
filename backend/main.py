import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from feishu_logger import upsert_log_to_bitable
import json
from pathlib import Path
FAQ_CONTEXT = Path("faqs.txt").read_text()

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
                   "https://staging.leylinepro.ai",
                   "https://staging.leylinepro.ai/mktp"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ZayaLog(BaseModel):
    userId: str
    userIntent: str
    userMessage: str
    timestamp: str
    pageUrl: str
    fullConversation: str  # JSON string

# Temporary memory to track full message history for better AI replies
user_conversations = {}

@app.post("/api/zaya-log")
async def log_zaya_data(data: ZayaLog):
    print("Received log:", data.dict())

    # Append message to plain text summary for summarization
    user_conversations.setdefault(data.userId, [])
    user_conversations[data.userId].append(data.userMessage)
    plain_text_convo = "\n".join(
        m if isinstance(m, str) else m.get("content", "")
        for m in user_conversations[data.userId]
    )


    # Summarize plain-text version of full convo
    summary_prompt = f"Summarize this user's conversation briefly:\n{plain_text_convo}"
    try:
        summary_response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{ "role": "user", "content": summary_prompt }],
            temperature=0.5,
            max_tokens=60
        )
        summary = summary_response.choices[0].message.content.strip()
    except Exception as e:
        print("OpenAI summary error:", e)
        summary = ""

    # Write to Feishu
    result = upsert_log_to_bitable(
        user_id=data.userId,
        intent=data.userIntent,
        message=data.userMessage,
        timestamp=data.timestamp,
        url=data.pageUrl,
        summary=summary,
        full_convo=data.fullConversation
    )

    # Get AI response based on full message history
    ai_reply = generate_ai_response(data.userIntent, data.userMessage, data.userId)

    return {
        "success": True,
        "feishu_response": result,
        "ai_response": ai_reply
    }

def generate_ai_response(intent, message, user_id):
    user_conversations.setdefault(user_id, [])
    messages = [{
        "role": "system",
        "content": f"""You are Zaya, a helpful assistant for creators and developers using Leyline.

    Use the following knowledge base to answer any platform-related questions:
    {FAQ_CONTEXT}

    Keep answers concise and friendly. If the user asks something unrelated, just try your best."""
    }]

    # Add prior user messages
    for m in user_conversations[user_id]:
        if isinstance(m, dict) and "role" in m:
            messages.append(m)
        elif isinstance(m, str):
            messages.append({"role": "user", "content": m})

    # Add latest message
    user_msg = {"role": "user", "content": message}
    user_conversations[user_id].append(user_msg)
    messages.append(user_msg)

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            temperature=0.7,
            max_tokens=150
        )
        reply = response.choices[0].message.content.strip()
        user_conversations[user_id].append({"role": "assistant", "content": reply})
        return reply
    except Exception as e:
        print("OpenAI error:", e)
        return "Sorry, something went wrong generating my reply!"
