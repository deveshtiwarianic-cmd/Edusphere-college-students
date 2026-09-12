export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is not configured on the server."
    });
  }

  try {
    const { messages = [], subject = "General" } = req.body || {};

    const clean = Array.isArray(messages)
      ? messages.slice(-12).map((m) => {
          if (Array.isArray(m.content)) {
            return {
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content
            };
          }

          return {
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content || "").slice(0, 5000)
          };
        })
      : [];

    if (!clean.length) {
      return res.status(400).json({
        error: "No message provided."
      });
    }

    const system = `
You are EduSphere AI, a helpful study assistant for Indian college and engineering students.

Current subject: ${subject}

Rules:
- Explain Maths, Physics, Chemistry, Programming, Engineering, aptitude and college-study questions.
- Give step-by-step explanations.
- Prefer simple Hinglish when the student uses Hindi/Hinglish.
- Otherwise answer in the user's language.
- Show important formulas and steps.
- Help solve questions from uploaded photos.
- Be accurate and easy for a college student to understand.
- If a question is unclear, ask one short clarification.
- You are the AI assistant inside EduSphere.
`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({
          model: "gpt-5.6-luna",
          instructions: system,
          input: clean
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "AI request failed."
      });
    }

    const text =
      data.output_text ||
      (data.output || [])
        .flatMap((item) => item.content || [])
        .map((part) => part.text || "")
        .join("")
        .trim();

    return res.status(200).json({
      text:
        text ||
        "Sorry, I could not generate a response."
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Server error while contacting the AI."
    });
  }
      }
