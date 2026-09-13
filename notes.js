// EduSphere AI Notes — PDF summary endpoint for Vercel
const MAX_FILE_CHARS = 11_000_000; // base64/data URL safety cap
const MAX_OUTPUT_TOKENS = 1000;
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(500).json({error:'OPENAI_API_KEY is not configured on the server.'});
  try{
    const {file,filename='notes.pdf'}=req.body||{};
    if(typeof file!=='string' || !file.startsWith('data:application/pdf;base64,')) return res.status(400).json({error:'Please upload a PDF file.'});
    if(file.length>MAX_FILE_CHARS) return res.status(413).json({error:'PDF is too large. Please upload a smaller PDF.'});
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({
      model:'gpt-5.6-luna',
      instructions:'You are EduSphere AI Notes. Summarize the uploaded college/engineering study PDF faithfully. Use only information present in the PDF. Return: 1) Short Summary, 2) Important Points, 3) Key Formulas/Definitions if present, 4) Quick Revision. Use simple Hinglish if the source/user context is Hinglish. Do not invent missing information.',
      input:[{role:'user',content:[{type:'input_file',filename,data:file},{type:'input_text',text:'Please summarize these notes for a college student.'}]}],
      max_output_tokens:MAX_OUTPUT_TOKENS
    })});
    const data=await response.json();
    if(!response.ok){console.error(data);return res.status(response.status).json({error:data?.error?.message||'AI summary failed.'});}
    const text=data.output_text||(data.output||[]).flatMap(x=>x.content||[]).map(x=>x.text||'').join('').trim();
    return res.status(200).json({text:text||'No summary generated.'});
  }catch(e){console.error(e);return res.status(500).json({error:'Server error while creating the summary.'});}
}
