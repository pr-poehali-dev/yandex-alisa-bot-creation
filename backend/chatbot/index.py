import json
import os
import urllib.request
import urllib.error


def handler(event: dict, context) -> dict:
    """Отвечает на любое сообщение пользователя через Google Gemini."""
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

    api_key = os.environ.get('GEMINI_API_KEY', '').strip()
    api_key = ''.join(c for c in api_key if ord(c) < 128)

    contents = []
    for msg in history[-10:]:
        role = msg.get('role')
        if role == 'user':
            contents.append({'role': 'user', 'parts': [{'text': msg['content']}]})
        elif role == 'assistant':
            contents.append({'role': 'model', 'parts': [{'text': msg['content']}]})
    contents.append({'role': 'user', 'parts': [{'text': message}]})

    payload = json.dumps({
        'system_instruction': {
            'parts': [{'text': (
                'Ты Семицвет AI 2.0 — умный и дружелюбный помощник. '
                'Отвечай на русском языке, кратко и по делу. '
                'Ты создан разработчиком Lavrov1yList.'
            )}]
        },
        'contents': contents,
        'generationConfig': {'maxOutputTokens': 500, 'temperature': 0.7}
    }).encode('utf-8')

    url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}'
    req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'}, method='POST')

    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
        reply = result['candidates'][0]['content']['parts'][0]['text']
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f'[Gemini ERROR] status={e.code} body={error_body}')
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'reply': f'Ошибка {e.code}: {error_body}'})
        }

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'reply': reply})
    }