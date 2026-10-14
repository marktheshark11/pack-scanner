const CATS = ["Documents & Money","Clothing","Footwear","Toiletries","Medicine & First Aid","Electronics","Sleeping Gear","Food & Drink","Security","Outdoor & Navigation","Bags & Organization","Misc & Entertainment"];
const buildPrompt = (list) => `You identify one travel/luggage item in a photo for a backpacker packing app.

The user's packing list (English names):
${list.length ? list.map((n) => "- " + n).join("\n") : "(empty)"}

Rules:
1. Name the physical object itself that is the main subject of the photo, never its accessory or container. If an item is shown (or held) together with its case, cover, box, bag or packaging, name the item itself. Examples: wireless earbuds -> "Wireless earbuds", never "Earbud case"; a phone -> "Phone", never "Phone case"; a camera -> "Camera", never "Camera bag". Name a case, cover, box or bag only when that is the only thing in the photo.
2. Ignore hands, people, tables and backgrounds.
3. Prefer the list: if the item reasonably matches one list entry, set "match" to that entry copied exactly. If nothing on the list fits, set "match" to null and give the item's own name in "item".
4. Respond with ONLY a JSON object, no markdown:
{"match":"<exact list entry or null>","item":"<short English name of the item itself, or null>","item_zh":"<中文名>","category":"<one of: ${CATS.join(" | ")}>","confidence":<0-1>}
5. If no single clear item is visible (blurry, empty, item cut off), return {"match":null,"item":null}.`;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) return res.status(500).json({ error: "AI_GATEWAY_API_KEY is not set in the Vercel project env" });
  const { model, image } = req.body || {};
  const list = (Array.isArray(req.body?.list) ? req.body.list : []).slice(0, 300).map((n) => String(n).replace(/[\r\n]+/g, " ").slice(0, 60));
  if (!/^[\w.-]+\/[\w.:-]+$/.test(model || "") || !String(image || "").startsWith("data:image/"))
    return res.status(400).json({ error: "Bad request" });
  try {
    const r = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({
        model, max_tokens: 200, temperature: 0,
        messages: [{ role: "user", content: [{ type: "text", text: buildPrompt(list) }, { type: "image_url", image_url: { url: image } }] }],
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = j.error;
      return res.status(r.status).json({ error: (e && e.message) || (typeof e === "string" ? e : "Gateway HTTP " + r.status) });
    }
    res.status(200).json({ text: j.choices?.[0]?.message?.content || "" });
  } catch (e) {
    res.status(502).json({ error: "Gateway unreachable: " + e.message });
  }
};
