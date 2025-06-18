import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Ai } from '@cloudflare/ai';
import { GoogleGenerativeAI } from '@google/generative-ai';


type Bindings = {
  GEMINI_API_KEY: string;
  AI: Ai;
  
}

const app = new Hono<{ Bindings: Bindings}>();

app.use('/*', 
  cors({
    origin:'*', // allow req from nextjs app
    allowHeaders: ['X-Custom-Header', 'Upgrade-Insecure-Requests', 'Content-Type'],
    // add content-type to the alloed headers to fix cors
    allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT'],
    exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
    maxAge: 600,
    credentials: true
  })
)

app.post('/chatToDocument', async (c) => {
  const genai = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);
  const model = genai.getGenerativeModel({model: 'gemini-2.5-flash'})

  const { documentData, question } = await c.req.json();

  const chatCompletion = await model.startChat({
    history: [
      {
          role: "user",
          parts: [{
          text: 'My Question is: ' + question,
        }]
        
      },
      {
          role: "model",
          parts: [{
          text: 'You are a assistant helping the user to chat to a document, I am providing a JSON file of the markdown for the document. Using this, answer the users question in the clearest way possible, the document is about ' +
					documentData
        }]
      }
    ]
  })

  const result = await chatCompletion.sendMessage([{ text: '' }]);
  const response = result.response.text();

  return c.json({message: response})
  

})


app.post('/translateDocument', async (c) => {
  const { documentData, targetLang } = await c.req.json();

  //generate summary of the document
  const summaryResponse = await c.env.AI.run('@cf/facebook/bart-large-cnn', {
    input_text: documentData,
    max_length: 1000,
  })



  const response = await c.env.AI.run('@cf/meta/m2m100-1.2b', {
    text: summaryResponse.summary,
    source_lang: 'english',
    target_lang: targetLang
  })

  return c.json(response)
})

export default app

