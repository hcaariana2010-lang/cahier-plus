// api/generer-cours.js
// Fonction serverless Vercel — reçoit le cours de l'élève, appelle l'API Claude,
// renvoie un résumé, des points clés et un quiz au format JSON.
// La clé API reste ici, côté serveur : jamais exposée au navigateur.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erreur: 'Méthode non autorisée' });
  }

  const { matiere, niveau, texteCours } = req.body;

  if (!texteCours || texteCours.trim().length < 20) {
    return res.status(400).json({ erreur: 'Le contenu du cours est trop court ou manquant.' });
  }

  const promptSysteme = `Tu es un assistant pédagogique pour des lycéens français.
On te donne un extrait de cours (matière : ${matiere || 'non précisée'}, niveau : ${niveau || 'non précisé'}).
Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, au format exact suivant :

{
  "resume": ["paragraphe 1", "paragraphe 2"],
  "pointsCles": ["point 1", "point 2", "point 3", "point 4"],
  "quiz": [
    {
      "question": "texte de la question",
      "options": ["option A", "option B", "option C", "option D"],
      "bonneReponse": 0,
      "explication": "pourquoi c'est la bonne réponse"
    }
  ]
}

Génère 5 questions de quiz de difficulté progressive, adaptées au niveau indiqué.
Le résumé doit être clair, simple, sans jargon inutile. Les points clés doivent être concrets et mémorisables.`;

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
        max_tokens: 2000,
        system: promptSysteme,
        messages: [
          { role: 'user', content: texteCours },
        ],
      }),
    });

    if (!reponseIA.ok) {
      const erreurTexte = await reponseIA.text();
      console.error('Erreur API Anthropic :', erreurTexte);
      return res.status(502).json({ erreur: "L'IA n'a pas pu traiter ce cours." });
    }

    const data = await reponseIA.json();
    const texteBrut = data.content?.[0]?.text || '';

    let resultat;
    try {
      resultat = JSON.parse(texteBrut);
    } catch (e) {
      console.error('Réponse IA non-JSON :', texteBrut);
      return res.status(502).json({ erreur: "Réponse de l'IA illisible, réessaie." });
    }

    return res.status(200).json(resultat);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ erreur: 'Erreur serveur, réessaie plus tard.' });
  }
}
