const fs = require('fs');
let content = fs.readFileSync('../tests/assistant.service.spec.ts', 'utf8');
content = content.replace('genAIMock.chats.create.mockReturnValue(chatMock);', 'genAIMock.chats = { create: vi.fn().mockReturnValue(chatMock) };');
fs.writeFileSync('../tests/assistant.service.spec.ts', content);
