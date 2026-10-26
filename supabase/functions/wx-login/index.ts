// supabase/functions/wx-login/index.ts
// 微信小程序登录云函数：code → openid → Supabase 用户

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface WxSession {
  openid: string;
  session_key: string;
  unionid?: string;
}

async function wxCode2Session(code: string): Promise<WxSession> {
  const appid = Deno.env.get("WX_APPID")!;
  const secret = Deno.env.get("WX_SECRET")!;
  const url =
    `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.errcode) throw new Error(`WX_ERR: ${data.errcode} ${data.errmsg}`);
  return { openid: data.openid, session_key: data.session_key, unionid: data.unionid };
}

serve(async (req) => {
  try {
    const { code } = await req.json();
    if (!code) return json({ error: "missing code" }, 400);

    // 1. 换 openid
    const { openid, session_key } = await wxCode2Session(code);

    // 2. 查找或创建 Supabase Auth 用户（以 openid 作为唯一标识）
    let userId: string;
    const { data: existUsers } = await supabase.auth.admin.listUsers({
      filter: `email=eq.${openid}@carbonpie.local`,
    });
    if (existUsers && existUsers.users.length > 0) {
      userId = existUsers.users[0].id;
    } else {
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: `${openid}@carbonpie.local`,
        password: session_key,
        email_confirm: true,
        user_metadata: { openid, source: "wechat-miniapp" },
      });
      if (error) throw error;
      userId = newUser.user.id;
    }

    // 3. 查找或创建 profiles 记录
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("id", userId)
      .single();
    if (!profile) {
      await supabase.from("profiles").insert({
        id: userId,
        display_name: `碳友${openid.slice(-4)}`,
      });
    }

    return json({
      openid,
      user_id: userId,
      nickname: profile?.display_name || `碳友${openid.slice(-4)}`,
      avatar: profile?.avatar_url || "",
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
