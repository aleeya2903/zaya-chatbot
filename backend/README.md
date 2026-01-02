## Zaya Chatbot Backend
This is the backend API for Zaya, an embedded website chatbot for Leyline that:

- Identifies the user's intent (Creator or Developer)
- Provides a button with the link to submit a bug report form
- Responds with relevant guidance using OpenAI's GPT models
- Logs all user interactions (intent, messages, timestamp, page URL, and full conversation) into a Feishu (Lark) multi-dimensional table for internal analysis

### Tech Stack
- Python + FastAPI for backend API
- OpenAI GPT-3.5 Turbo for response generation and summarization
- Feishu Developer API for data logging into Bitable
- Pydantic for request validation
- dotenv for managing environment variables

### Project Structure
```
zaya-backend/
├── main.py                 # FastAPI app with /api/zaya-log endpoint
├── feishu_logger.py        # Handles token retrieval and Feishu Bitable logging
├── faqs.txt                # Internal knowledge base used by GPT
├── .env                    # Environment variable definitions (not committed)
├── requirements.txt        # Python dependencies
```

### Setup Instructions
1. Clone the repository

```
git clone https://github.com/aleeya2903/zaya-chatbot/backend.git
cd backend
```

2. Create .env file
Create a .env file in the root directory and fill in your secrets:

```
OPENAI_API_KEY=your_openai_key
FEISHU_APP_ID=your_feishu_app_id
FEISHU_APP_SECRET=your_feishu_app_secret
FEISHU_TABLE_APP_TOKEN=your_bitable_app_token
FEISHU_TABLE_ID=your_bitable_table_id
```

3. Install dependencies

```
pip install -r requirements.txt
```

4. Run the server locally

```
uvicorn main:app --reload --port 8000
The API will now be running at http://localhost:8000.
```

### API Endpoint
POST /api/zaya-log
Logs a user's message and generates an AI response.

Request Body (JSON)

```
{
  "userId": "abc123",
  "userIntent": "creator",
  "userMessage": "How do I use StormEye?",
  "timestamp": "2025-07-09T16:15:30Z",
  "pageUrl": "https://leylinepro.ai/mktp",
  "fullConversation": "[{ \"role\": \"user\", \"message\": \"...\" }, ...]"
}
```

Response Example

```
{
  "success": true,
  "feishu_response": { ... },
  "ai_response": "You can access StormEye through the Creator dashboard..."
}
```

### AI Integration
- Uses faqs.txt as an internal reference context.
- Summarizes full user conversations into a concise description for Feishu logging.
- Keeps short, friendly, brand-aligned replies via OpenAI's gpt-3.5-turbo.

### Logging to Feishu Bitable
Feishu logs include:
- User ID
- User Intent
- Last Message
- Timestamp
- Page URL
- Full Conversation (JSON-formatted)
- Conversation Summary (AI-generated)

If a user already exists, the log updates their existing record; otherwise, it creates a new one.

### MVP Acceptance Criteria
- Bot backend can receive and log user role + message
- Generates meaningful next-step replies using OpenAI
- Logs all inputs into Feishu Bitable in real-time
- Responds with OpenAI-powered answers referencing internal FAQ
