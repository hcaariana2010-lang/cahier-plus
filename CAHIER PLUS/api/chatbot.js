// api/chatbot.js
// Fonction serverless Vercel — le chatbot répond aux questions de l'élève
// en s'appuyant sur le contenu de son cours (contexte fourni par le frontend).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erreur: 'Méthode non autorisée' });
  }

  const { contexteCours, historique, question } = req.body;

  if (!question || question.trim().length === 0) {
    return res.status(400).json({ erreur: 'Question manquante.' });
  }

  const promptSysteme = `Tu es un assistant pédagogique pour un lycéen français.
Voici le cours sur lequel il travaille :
"""
${contexteCours || 'Aucun cours fourni.'}
"""
Réponds à ses questions en te basant sur ce cours. Explique simplement, comme un bon prof particulier :
phrases courtes, exemples concrets, pas de jargon inutile. Si la question sort du cadre du cours,
dis-le gentiment et recentre sur le sujet. Réponds en 3-5 phrases maximum sauf si l'élève demande plus de détails.`;

  // L'historique envoyé par le frontend est une liste de { role: 'user'|'assistant', content: '...' }
  const messages = [
    ...(Array.isArray(historique) ? historique : []),
    { role: 'user', content: question },
  ];

  try {
    const reponseIA = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 500,
        system: promptSysteme,
        messages,
      }),
    });

    if (!reponseIA.ok) {
      const erreurTexte = await reponseIA.text();
      console.error('Erreur API Anthropic :', erreurTexte);
      return res.status(502).json({ erreur: "Le chatbot n'a pas pu répondre." });
    }

    const data = await reponseIA.json();
    const texteReponse = data.content?.[0]?.text || "Désolé, je n'ai pas pu générer de réponse.";

    return res.status(200).json({ reponse: texteReponse });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ erreur: 'Erreur serveur, réessaie plus tard.' });
  }
}
