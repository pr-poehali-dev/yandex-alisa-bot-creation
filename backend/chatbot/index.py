import json
import os
import urllib.request
import urllib.error


def handler(event: dict, context) -> dict:
    """Отвечает на сообщения пользователя через Groq API."""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }

    body = json.loads(event.get('body') or '{}')
    message = body.get('message', '')
    history = body.get('history', [])

    if not message:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'message is required'})
        }

    messages = [
        {
            'role': 'system',
            'content': (
                'Ты Семицвет AI 2.0 — умный и дружелюбный помощник. '
                'Отвечай на русском языке, кратко и по делу. '
                'Ты создан разработчиком Lavrov1yList.'
            )
        }
    ]

    for msg in history[-10:]:
        role = msg.get('role')
        if role in ('user', 'assistant'):
            messages.append({'role': role, 'content': msg['content']})

    messages.append({'role': 'user', 'content': message})

    api_key = ''.join(c for c in os.environ.get('GROQ_API_KEY', '') if ord(c) < 128).strip()

    payload = json.dumps({
        'model': 'llama-3.3-70b-versatile',
        'messages': messages,
        'max_tokens': 500,
        'temperature': 0.7
    }).encode('utf-8')

    req = urllib.request.Request(
        'https://api.groq.com/openai/v1/chat/completions',
        data=payload,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        },
        method='POST'
    )

    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
        reply = result['choices'][0]['message']['content']
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f'[Groq ERROR] status={e.code} body={error_body}')
        reply = 'Извини, не могу ответить прямо сейчас. Попробуй чуть позже.'

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'reply': reply})
    }
