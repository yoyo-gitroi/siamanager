import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OpenAI_API");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    
    if (!OPENAI_API_KEY || !SUPABASE_URL) {
      throw new Error("Missing required environment variables");
    }

    // Fetch the Excel files from the public folder
    const linkedinResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/public/data/linkedin-data.xlsx`);
    const youtubeResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/public/data/youtube-data.xlsx`);

    if (!linkedinResponse.ok || !youtubeResponse.ok) {
      // Try fetching from the deployed site instead
      const baseUrl = SUPABASE_URL.replace('.supabase.co', '.lovable.app');
      const linkedinFallback = await fetch(`${baseUrl}/data/linkedin-data.xlsx`);
      const youtubeFallback = await fetch(`${baseUrl}/data/youtube-data.xlsx`);
      
      if (!linkedinFallback.ok || !youtubeFallback.ok) {
        throw new Error("Could not fetch Excel files");
      }
    }

    const linkedinBlob = await linkedinResponse.blob();
    const youtubeBlob = await youtubeResponse.blob();

    // Upload files to OpenAI
    const linkedinFormData = new FormData();
    linkedinFormData.append('file', linkedinBlob, 'linkedin-data.xlsx');
    linkedinFormData.append('purpose', 'assistants');

    const youtubeFormData = new FormData();
    youtubeFormData.append('file', youtubeBlob, 'youtube-data.xlsx');
    youtubeFormData.append('purpose', 'assistants');

    const [linkedinUpload, youtubeUpload] = await Promise.all([
      fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: linkedinFormData,
      }),
      fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: youtubeFormData,
      }),
    ]);

    const linkedinFile = await linkedinUpload.json();
    const youtubeFile = await youtubeUpload.json();

    // Create vector store with the files
    const vectorStoreResponse = await fetch('https://api.openai.com/v1/vector_stores', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        name: 'Analytics Data',
        file_ids: [linkedinFile.id, youtubeFile.id],
      }),
    });

    const vectorStore = await vectorStoreResponse.json();

    // Update the SIA assistant with the vector store
    const listResponse = await fetch('https://api.openai.com/v1/assistants?limit=100', {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });

    const assistants = await listResponse.json();
    const siaAssistant = assistants.data?.find((a: any) => a.name === 'SIA');

    if (siaAssistant) {
      await fetch(`https://api.openai.com/v1/assistants/${siaAssistant.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
        body: JSON.stringify({
          tool_resources: {
            file_search: {
              vector_store_ids: [vectorStore.id],
            },
          },
        }),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        vectorStoreId: vectorStore.id,
        fileIds: [linkedinFile.id, youtubeFile.id],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("File upload error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Upload failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
