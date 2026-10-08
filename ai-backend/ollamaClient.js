const { Ollama } = require("ollama");

const ollama = new Ollama({
  host: "http://127.0.0.1:11434"
});

async function askOllama(prompt) {
  const response = await ollama.chat({
    model: "llama3",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  return response.message.content;
}

module.exports = { askOllama };