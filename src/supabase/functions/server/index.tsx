import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Supabase Admin Client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Supabase Client (para operações não-admin)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);

// CORS PRIMEIRO - antes de tudo
app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://porschecup.vercel.app',
    'https://porschecup-4wcz45zi9-rafaels-projects-d8a48143.vercel.app',
    /https:\/\/.*\.vercel\.app$/
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: [
    'Content-Type', 
    'Authorization', 
    'Accept', 
    'X-Requested-With',
    'apikey',
    'X-Client-Info'
  ],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
  credentials: false,
}));

// Handle OPTIONS requests explicitly
app.options('*', (c) => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With, apikey, X-Client-Info',
      'Access-Control-Max-Age': '86400',
    }
  });
});

app.use('*', logger(console.log));

// ============================================
// HEALTH CHECK & TEST ROUTES
// ============================================

/**
 * Health check endpoint
 * GET /make-server-18cdc61b/health
 */
app.get("/make-server-18cdc61b/health", (c) => {
  return c.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    routes: {
      signup: '/make-server-18cdc61b/signup',
      login: '/make-server-18cdc61b/auth/login',
      health: '/make-server-18cdc61b/health',
    }
  });
});

// ============================================
// AUTH MIDDLEWARE
// ============================================

/**
 * Middleware para verificar autenticação JWT
 */
async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Missing token' }, 401);
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return c.json({ success: false, error: 'Invalid token' }, 401);
    }
    
    c.set('user', user);
    c.set('userId', user.id);
    c.set('userRole', user.user_metadata?.role || 'operator');
    
    await next();
  } catch (error) {
    return c.json({ success: false, error: 'Token validation failed' }, 401);
  }
}

/**
 * Middleware para verificar role de admin
 */
async function adminMiddleware(c: any, next: any) {
  const userRole = c.get('userRole');
  
  if (userRole !== 'admin') {
    return c.json({ success: false, error: 'Forbidden: Admin access required' }, 403);
  }
  
  await next();
}

// ============================================
// AUTH ENDPOINTS
// ============================================

/**
 * Signup - Criar novo usuário
 * POST /auth/signup
 * Body: { email, password, name, role }
 * 
 * IMPORTANTE: Esta rota deve ser protegida por admin em produção
 * Atualmente permite criação de usuários para simplificar onboarding
 */
app.post("/make-server-18cdc61b/auth/signup", async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();
    
    // Validações
    if (!email || !password || !name) {
      return c.json({ 
        success: false, 
        error: 'Email, password e name são obrigatórios' 
      }, 400);
    }
    
    if (password.length < 6) {
      return c.json({ 
        success: false, 
        error: 'Senha deve ter pelo menos 6 caracteres' 
      }, 400);
    }
    
    // Validação de role
    const userRole = role || 'operator';
    if (!['admin', 'operator'].includes(userRole)) {
      return c.json({ 
        success: false, 
        error: 'Role inválido. Use "admin" ou "operator"' 
      }, 400);
    }
    
    // Cria usuário via Admin API
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirma email (sem servidor de email configurado)
      user_metadata: {
        name,
        role: userRole,
      },
    });
    
    if (error) {
      console.error('Signup error:', error);
      return c.json({ 
        success: false, 
        error: error.message || 'Erro ao criar usuário' 
      }, 400);
    }
    
    console.log(`User created: ${email} (${userRole})`);
    
    return c.json({ 
      success: true, 
      message: 'Usuário criado com sucesso',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name,
        role: data.user.user_metadata.role,
      }
    });
  } catch (error) {
    console.error('Signup endpoint error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Public Signup - Criar novo usuário (sempre como operator)
 * POST /signup
 * Body: { email, password, name }
 * 
 * Rota pública para cadastro de novos usuários
 * Sempre cria usuários com role "operator"
 */
app.post("/make-server-18cdc61b/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    // Validações
    if (!email || !password || !name) {
      return c.json({ 
        success: false, 
        error: 'Email, senha e nome são obrigatórios' 
      }, 400);
    }
    
    if (password.length < 6) {
      return c.json({ 
        success: false, 
        error: 'Senha deve ter pelo menos 6 caracteres' 
      }, 400);
    }
    
    if (name.trim().length < 3) {
      return c.json({ 
        success: false, 
        error: 'Nome deve ter pelo menos 3 caracteres' 
      }, 400);
    }
    
    // Validação de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ 
        success: false, 
        error: 'Email inválido' 
      }, 400);
    }
    
    // Cria usuário via Admin API - SEMPRE como operator
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // Auto-confirma email (sem servidor de email configurado)
      user_metadata: {
        name: name.trim(),
        role: 'operator', // SEMPRE operator para cadastro público
      },
    });
    
    if (error) {
      console.error('Public signup error:', error);
      
      // Mensagens de erro mais amigáveis
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        return c.json({ 
          success: false, 
          error: 'Este email já está cadastrado. Faça login ou use outro email.' 
        }, 400);
      }
      
      return c.json({ 
        success: false, 
        error: error.message || 'Erro ao criar conta' 
      }, 400);
    }
    
    console.log(`New user registered: ${email} (operator)`);
    
    return c.json({ 
      success: true, 
      message: 'Conta criada com sucesso! Você já pode fazer login.',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name,
        role: 'operator',
      }
    });
  } catch (error) {
    console.error('Public signup endpoint error:', error);
    return c.json({ 
      success: false, 
      error: 'Erro ao criar conta. Tente novamente mais tarde.' 
    }, 500);
  }
});

/**
 * Login - Autenticar usuário
 * POST /auth/login
 * Body: { email, password }
 */
app.post("/make-server-18cdc61b/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ 
        success: false, 
        error: 'Email e senha são obrigatórios' 
      }, 400);
    }
    
    // Autentica via Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Login error:', error.message);
      return c.json({ 
        success: false, 
        error: 'Credenciais inválidas' 
      }, 401);
    }
    
    console.log(`User logged in: ${email}`);
    
    return c.json({ 
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || email.split('@')[0],
        role: data.user.user_metadata?.role || 'operator',
      }
    });
  } catch (error) {
    console.error('Login endpoint error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Logout - Encerrar sessão
 * POST /auth/logout
 * Headers: Authorization: Bearer <token>
 */
app.post("/make-server-18cdc61b/auth/logout", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: true, message: 'Already logged out' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Revoga o token
    await supabaseAdmin.auth.admin.signOut(token);
    
    console.log('User logged out');
    
    return c.json({ success: true, message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Logout error:', error);
    // Mesmo com erro, consideramos logout bem-sucedido
    return c.json({ success: true, message: 'Logout realizado' });
  }
});

/**
 * Verificar sessão
 * GET /auth/session
 * Headers: Authorization: Bearer <token>
 */
app.get("/make-server-18cdc61b/auth/session", authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    return c.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        role: user.user_metadata?.role || 'operator',
      }
    });
  } catch (error) {
    console.error('Session check error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Atualizar perfil do usuário
 * PUT /auth/profile
 * Headers: Authorization: Bearer <token>
 * Body: { name }
 */
app.put("/make-server-18cdc61b/auth/profile", authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { name } = await c.req.json();
    
    if (!name) {
      return c.json({ 
        success: false, 
        error: 'Nome é obrigatório' 
      }, 400);
    }
    
    // Atualiza user metadata
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: { name } }
    );
    
    if (error) {
      console.error('Profile update error:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log(`Profile updated for user: ${userId}`);
    
    return c.json({ 
      success: true,
      message: 'Perfil atualizado com sucesso',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name,
        role: data.user.user_metadata.role,
      }
    });
  } catch (error) {
    console.error('Profile update endpoint error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Password Recovery - Solicitar reset de senha
 * POST /auth/password-recovery
 * Body: { email }
 */
app.post("/make-server-18cdc61b/auth/password-recovery", async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ 
        success: false, 
        error: 'Email é obrigatório' 
      }, 400);
    }
    
    // Valida formato do email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ 
        success: false, 
        error: 'Email inválido' 
      }, 400);
    }
    
    // Envia email de recuperação via Supabase Auth
    // NOTA: Requer configuração de email template no Supabase Dashboard
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${c.req.header('origin') || 'http://localhost:3000'}/reset-password`,
    });
    
    if (error) {
      console.error('Password recovery error:', error);
      // Por segurança, não revela se o email existe ou não
      // Sempre retorna sucesso
    }
    
    console.log(`Password recovery requested for: ${email}`);
    
    // Sempre retorna sucesso (segurança)
    return c.json({ 
      success: true,
      message: 'Se o email existir, você receberá instruções para redefinir sua senha.'
    });
  } catch (error) {
    console.error('Password recovery endpoint error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Password Reset - Atualizar senha com token
 * POST /auth/password-reset
 * Body: { access_token, new_password }
 */
app.post("/make-server-18cdc61b/auth/password-reset", async (c) => {
  try {
    const { access_token, new_password } = await c.req.json();
    
    if (!access_token || !new_password) {
      return c.json({ 
        success: false, 
        error: 'Token e nova senha são obrigatórios' 
      }, 400);
    }
    
    if (new_password.length < 6) {
      return c.json({ 
        success: false, 
        error: 'Senha deve ter pelo menos 6 caracteres' 
      }, 400);
    }
    
    // Verifica o token de reset
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(access_token);
    
    if (userError || !user) {
      return c.json({ 
        success: false, 
        error: 'Token inválido ou expirado' 
      }, 401);
    }
    
    // Atualiza a senha
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    );
    
    if (updateError) {
      console.error('Password reset error:', updateError);
      return c.json({ 
        success: false, 
        error: 'Erro ao atualizar senha' 
      }, 500);
    }
    
    console.log(`Password reset completed for user: ${user.id}`);
    
    return c.json({ 
      success: true,
      message: 'Senha atualizada com sucesso'
    });
  } catch (error) {
    console.error('Password reset endpoint error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Health check endpoint (público)
app.get("/make-server-18cdc61b/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============================================
// TIRE MODELS ENDPOINTS (Protegido)
// ============================================

app.get("/make-server-18cdc61b/tire-models", authMiddleware, async (c) => {
  try {
    const models = await kv.get("tire_models") || [];
    return c.json({ success: true, data: models });
  } catch (error) {
    console.error("Error fetching tire models:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post("/make-server-18cdc61b/tire-models", authMiddleware, adminMiddleware, async (c) => {
  try {
    const models = await c.req.json();
    await kv.set("tire_models", models);
    console.log(`Tire models updated by user: ${c.get('userId')}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving tire models:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// CONTAINERS ENDPOINTS (Protegido)
// ============================================

app.get("/make-server-18cdc61b/containers", authMiddleware, async (c) => {
  try {
    const containers = await kv.get("containers") || [];
    return c.json({ success: true, data: containers });
  } catch (error) {
    console.error("Error fetching containers:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post("/make-server-18cdc61b/containers", authMiddleware, adminMiddleware, async (c) => {
  try {
    const containers = await c.req.json();
    await kv.set("containers", containers);
    console.log(`Containers updated by user: ${c.get('userId')}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving containers:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// STOCK ENTRIES ENDPOINTS (Protegido)
// ============================================

app.get("/make-server-18cdc61b/stock-entries", authMiddleware, async (c) => {
  try {
    const entries = await kv.get("stock_entries") || [];
    return c.json({ success: true, data: entries });
  } catch (error) {
    console.error("Error fetching stock entries:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post("/make-server-18cdc61b/stock-entries", authMiddleware, async (c) => {
  try {
    const entry = await c.req.json();
    const entries = await kv.get("stock_entries") || [];
    
    // Check for duplicate barcode
    const duplicate = entries.find((e: any) => e.barcode === entry.barcode);
    if (duplicate) {
      return c.json({ success: false, error: "Barcode already exists" }, 400);
    }
    
    entries.push(entry);
    await kv.set("stock_entries", entries);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving stock entry:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.delete("/make-server-18cdc61b/stock-entries/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const entries = await kv.get("stock_entries") || [];
    const updated = entries.filter((e: any) => e.id !== id);
    await kv.set("stock_entries", updated);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting stock entry:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post("/make-server-18cdc61b/stock-entries/bulk-delete", authMiddleware, async (c) => {
  try {
    const { ids } = await c.req.json();
    const entries = await kv.get("stock_entries") || [];
    const updated = entries.filter((e: any) => !ids.includes(e.id));
    await kv.set("stock_entries", updated);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error bulk deleting stock entries:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update stock entries in bulk
app.put("/make-server-18cdc61b/stock-entries", authMiddleware, async (c) => {
  try {
    const entries = await c.req.json();
    
    // Validação básica
    if (!Array.isArray(entries)) {
      return c.json({ success: false, error: "Invalid data format" }, 400);
    }
    
    await kv.set("stock_entries", entries);
    console.log(`Updated ${entries.length} stock entries in bulk`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating stock entries:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update single stock entry
app.put("/make-server-18cdc61b/stock-entries/:barcode", authMiddleware, async (c) => {
  try {
    const barcode = c.req.param("barcode");
    const updates = await c.req.json();
    const entries = await kv.get("stock_entries") || [];
    const index = entries.findIndex((e: any) => e.barcode === barcode);
    
    if (index === -1) {
      return c.json({ success: false, error: "Entry not found" }, 404);
    }
    
    entries[index] = { ...entries[index], ...updates };
    await kv.set("stock_entries", entries);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating stock entry:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// TIRE MOVEMENTS ENDPOINTS (Protegido)
// ============================================

app.get("/make-server-18cdc61b/tire-movements", authMiddleware, async (c) => {
  try {
    const movements = await kv.get("tire_movements") || [];
    return c.json({ success: true, data: movements });
  } catch (error) {
    console.error("Error fetching tire movements:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post("/make-server-18cdc61b/tire-movements", authMiddleware, async (c) => {
  try {
    const movement = await c.req.json();
    const movements = await kv.get("tire_movements") || [];
    
    // Add timestamp if not present
    if (!movement.timestamp) {
      movement.timestamp = new Date().toISOString();
    }
    
    movements.push(movement);
    await kv.set("tire_movements", movements);
    console.log("Tire movement saved:", movement.id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving tire movement:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Bulk save tire movements
app.put("/make-server-18cdc61b/tire-movements", authMiddleware, async (c) => {
  try {
    const movements = await c.req.json();
    
    if (!Array.isArray(movements)) {
      return c.json({ success: false, error: "Invalid data format" }, 400);
    }
    
    await kv.set("tire_movements", movements);
    console.log(`Updated ${movements.length} tire movements in bulk`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating tire movements:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// TIRE CONSUMPTION ENDPOINTS (Protegido)
// ============================================

app.get("/make-server-18cdc61b/tire-consumption", authMiddleware, async (c) => {
  try {
    const records = await kv.get("tire_consumption") || [];
    return c.json({ success: true, data: records });
  } catch (error) {
    console.error("Error fetching consumption records:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post("/make-server-18cdc61b/tire-consumption", authMiddleware, async (c) => {
  try {
    const record = await c.req.json();
    const records = await kv.get("tire_consumption") || [];
    
    // Add timestamp if not present
    if (!record.timestamp) {
      record.timestamp = new Date().toISOString();
    }
    
    records.push(record);
    await kv.set("tire_consumption", records);
    console.log("Consumption record saved:", record.id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving consumption record:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Bulk save consumption records
app.put("/make-server-18cdc61b/tire-consumption", authMiddleware, async (c) => {
  try {
    const records = await c.req.json();
    
    if (!Array.isArray(records)) {
      return c.json({ success: false, error: "Invalid data format" }, 400);
    }
    
    await kv.set("tire_consumption", records);
    console.log(`Updated ${records.length} consumption records in bulk`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating consumption records:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// USERS ENDPOINTS (Admin only - Deprecated, use Supabase Auth)
// ============================================

app.get("/make-server-18cdc61b/users", authMiddleware, adminMiddleware, async (c) => {
  try {
    const users = await kv.get("users") || [];
    return c.json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post("/make-server-18cdc61b/users", authMiddleware, adminMiddleware, async (c) => {
  try {
    const users = await c.req.json();
    await kv.set("users", users);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving users:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// SETUP INICIAL - Cria primeiro admin
// ============================================

app.post("/make-server-18cdc61b/setup-admin", async (c) => {
  try {
    // Deleta usuário existente se houver
    try {
      await supabaseAdmin.auth.admin.deleteUser('8f5a7abd-9ec6-41b3-a418-e74844411874');
    } catch (e) {
      // Ignora erro se usuário não existir
    }
    
    // Cria novo usuário admin
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'rafaborgesg@gmail.com',
      password: 'Admin123!',
      email_confirm: true,
      user_metadata: {
        name: 'Rafael Borges',
        role: 'admin'
      }
    });
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ 
      success: true, 
      message: 'Admin criado com sucesso',
      credentials: {
        email: 'rafaborgesg@gmail.com',
        password: 'Admin123!'
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// USER MANAGEMENT - Gerenciamento de Usuários
// ============================================

// Criar usuário (ADMIN ONLY)
app.post("/make-server-18cdc61b/users", authMiddleware, async (c) => {
  try {
    // Verifica se usuário é admin
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user || user.user_metadata?.role !== 'admin') {
      return c.json({ success: false, error: 'Acesso negado. Apenas administradores podem criar usuários.' }, 403);
    }
    
    const { email, password, name, role, username } = await c.req.json();
    
    // Validação
    if (!email || !password || !name || !role) {
      return c.json({ success: false, error: 'Campos obrigatórios faltando' }, 400);
    }
    
    // Cria usuário no Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirma email
      user_metadata: {
        name,
        role,
        username: username || email.split('@')[0],
        active: true
      }
    });
    
    if (error) {
      console.error('Error creating user in Supabase Auth:', error);
      return c.json({ success: false, error: error.message }, 400);
    }
    
    console.log(`✅ Usuário criado no Supabase Auth: ${email} (${role})`);
    
    return c.json({ 
      success: true, 
      data: {
        id: data.user.id,
        email: data.user.email,
        name,
        role,
        username: username || email.split('@')[0],
        createdAt: data.user.created_at
      }
    });
  } catch (error) {
    console.error('Error in create user endpoint:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Listar todos os usuários (ADMIN ONLY)
app.get("/make-server-18cdc61b/users", authMiddleware, async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    if (user.user_metadata?.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }
    
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    const formattedUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.name || 'Sem nome',
      role: u.user_metadata?.role || 'operator',
      username: u.user_metadata?.username || u.email?.split('@')[0],
      active: u.user_metadata?.active !== false,
      createdAt: u.created_at
    }));
    
    return c.json({ success: true, data: formattedUsers });
  } catch (error) {
    return c.json({ success: false, error: error.message || 'Internal error' }, 500);
  }
});

// Atualizar usuário (ADMIN ONLY)
app.put("/make-server-18cdc61b/users/:id", authMiddleware, async (c) => {
  try {
    // Verifica se usuário é admin
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user || user.user_metadata?.role !== 'admin') {
      return c.json({ success: false, error: 'Acesso negado' }, 403);
    }
    
    const userId = c.req.param('id');
    const updates = await c.req.json();
    
    // Atualiza no Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: updates.email,
      password: updates.password, // Opcional
      user_metadata: {
        name: updates.name,
        role: updates.role,
        username: updates.username,
        active: updates.active
      }
    });
    
    if (error) {
      return c.json({ success: false, error: error.message }, 400);
    }
    
    console.log(`✅ Usuário atualizado: ${updates.email}`);
    
    return c.json({ success: true, data });
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Deletar usuário (ADMIN ONLY)
app.delete("/make-server-18cdc61b/users/:id", authMiddleware, async (c) => {
  try {
    // Verifica se usuário é admin
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user || user.user_metadata?.role !== 'admin') {
      return c.json({ success: false, error: 'Acesso negado' }, 403);
    }
    
    const userId = c.req.param('id');
    
    // Previne deletar a si mesmo
    if (userId === user.id) {
      return c.json({ success: false, error: 'Você não pode deletar seu próprio usuário' }, 400);
    }
    
    // Deleta do Supabase Auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (error) {
      return c.json({ success: false, error: error.message }, 400);
    }
    
    console.log(`🗑️ Usuário deletado: ${userId}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

Deno.serve(app.fetch);