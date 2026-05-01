import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    // Get the user from the auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401 });
    }

    // Create a client scoped to the calling user
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const userId = user.id;

    // Create service-role client for destructive operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ── Delete all user data in order (respecting FK constraints) ──
    await supabaseAdmin.from('spot_comments').delete().eq('user_id', userId);
    await supabaseAdmin.from('spot_saves').delete().eq('user_id', userId);
    await supabaseAdmin.from('spot_verifications').delete().eq('user_id', userId);
    await supabaseAdmin.from('spot_availability').delete().eq('user_id', userId);
    await supabaseAdmin.from('push_tokens').delete().eq('user_id', userId);
    await supabaseAdmin.from('feedback').delete().eq('user_id', userId);
    
    // Anonymise spots rather than delete them (preserves community data)
    await supabaseAdmin.from('foraging_spots').update({ user_id: null }).eq('user_id', userId);

    // Delete the profile
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // Delete the auth user — this is the critical step Apple requires
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      throw new Error(`Failed to delete auth user: ${deleteError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('delete-account error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
