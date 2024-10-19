require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const app = express();

// Use CORS middleware to allow requests from any origin
app.use(cors()); // or app.use(cors({ origin: '*' }));

// Function to process the user's message
async function processMessage(message) {
  // Check for critical symptoms
  const emergency = checkForCriticalSymptoms(message);

  // Construct the assistant's prompt
  let healthContext =
    "Вы опытный врач-терапевт. Ваша задача — помочь пациенту с рекомендациями по управлению симптомами. " +
    "Ответьте на основе предоставленной информации, избегайте отказов в рекомендациях и старайтесь предоставить полезные советы для лечения. " +
    "Если симптомы действительно критические, порекомендуйте обратиться за неотложной медицинской помощью.";

  const fullMessage = `${healthContext} Вот информация от пациента: ${message}`;

  try {
    // Send request to Gemini API
    const response = await model.generateContent(fullMessage);

    // Extract and return the response text
    if (
      response &&
      response.response &&
      typeof response.response.text === "function"
    ) {
      const assistantResponse = await response.response.text();

      return {
        resp: assistantResponse,
        emergency: emergency,
      };
    } else {
      console.error("Invalid response format from Gemini API");
      return {
        resp: "Извините, произошла ошибка при обработке вашего запроса.",
        emergency: emergency,
      };
    }
  } catch (error) {
    console.error("Error sending request to Gemini:", error);
    return {
      resp: "Извините, произошла ошибка при обработке вашего запроса.",
      emergency: emergency,
    };
  }
}

// Function to check for critical symptoms
function checkForCriticalSymptoms(message) {
  const lowerMessage = message.toLowerCase();
  let emergency = false;

  // Check for high temperature (40 degrees and above)
  if (
    lowerMessage.includes("температура") &&
    ["40", "41", "42", "43", "44", "45"].some((temp) =>
      lowerMessage.includes(temp)
    )
  ) {
    emergency = true;
  }
  // Check for shortness of breath
  else if (
    lowerMessage.includes("одышка") ||
    lowerMessage.includes("затрудненное дыхание") ||
    lowerMessage.includes("тяжело дышать")
  ) {
    emergency = true;
  }
  // Check for severe pain
  else if (
    lowerMessage.includes("сильная боль") ||
    lowerMessage.includes("боль в груди") ||
    lowerMessage.includes("острая боль")
  ) {
    emergency = true;
  }

  return emergency;
}

// Express route to handle chat requests
app.get("/chat", async (req, res) => {
  try {
    const userMessage = req.query.ques || "Здравствуйте"; // Get the user's message or default to 'Здравствуйте'

    // Process the user's message
    const result = await processMessage(userMessage);

    // Return the response as JSON
    res.status(200).json(result);
  } catch (error) {
    console.error("Error generating response from Gemini:", error);
    res
      .status(500)
      .json({ error: "Failed to generate a response from Gemini" });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
