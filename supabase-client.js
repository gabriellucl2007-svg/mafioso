// ===================================================================
// SUPABASE-CLIENT.JS — cria a conexão com o Supabase UMA ÚNICA VEZ
// e compartilha entre todos os scripts do site. Isso evita o aviso
// de "múltiplas instâncias" e problemas de sessão entre páginas.
// ===================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
