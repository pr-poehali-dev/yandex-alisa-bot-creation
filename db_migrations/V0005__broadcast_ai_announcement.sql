INSERT INTO system_notifications (username, type, text, is_read, created_at)
SELECT username, 'announcement', 'Здравствуйте все пользователи Семицвет AI, скоро в бота мы добавим ИИ, и он сможет отвечать на всё что угодно!!!', false, NOW()
FROM users;