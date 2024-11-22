export default defineEventHandler((event) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Chat Interface</title>
        <style>
          .chat-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .message {
            margin: 10px 0;
            padding: 10px;
            border-radius: 5px;
          }
          .user {
            background: #e3f2fd;
          }
          .assistant {
            background: #f5f5f5;
          }
          .input-form {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 20px;
            background: white;
          }
          .input-field {
            width: 100%;
            max-width: 800px;
            padding: 10px;
            margin: 0 auto;
            display: block;
          }
          .error {
            background: #ffebee;
            color: #c62828;
          }
        </style>
      </head>
      <body>
        <div id="app" class="chat-container">
          <div id="messages"></div>
          
          <form id="chatForm" class="input-form">
            <input id="messageInput" 
                   placeholder="Type your message..." 
                   class="input-field"/>
          </form>
        </div>

        <script>
          const messagesContainer = document.getElementById('messages');
          const chatForm = document.getElementById('chatForm');
          const messageInput = document.getElementById('messageInput');
          
          const messages = [{
            role: 'system',
            content: 'You are a helpful AI assistant.'
          }];

          function addMessage(role, content) {
            messages.push({ role, content });
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + role;
            messageDiv.innerHTML = \`<strong>\${role === 'user' ? 'You:' : 'AI:'}</strong> \${content}\`;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }

          chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = messageInput.value.trim();
            if (!message) return;
            
            addMessage('user', message);
            messageInput.value = '';

            try {
              const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages })
              });
              const data = await response.json();
              addMessage('assistant', data.response);
            } catch (error) {
              console.error('Error:', error);
              const errorDiv = document.createElement('div');
              errorDiv.className = 'message error';
              errorDiv.textContent = 'Error: Failed to get response from AI';
              messagesContainer.appendChild(errorDiv);
            }
          });
        </script>
      </body>
    </html>
  `;
});
