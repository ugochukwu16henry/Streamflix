import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — StreamFlix" }, { name: "description", content: "Sign in or create your StreamFlix account." }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/" });
  };

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — you're in");
    navigate({ to: "/" });
  };

  const signInGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return toast.error(result.error.message ?? "Google sign-in failed");
    if (!result.redirected) navigate({ to: "/" });
  };

  return (
    <main
      className="min-h-screen pt-24 px-4 bg-cover bg-center relative"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.85)), url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&q=70')",
      }}
    >
      <div className="max-w-md mx-auto bg-background/90 backdrop-blur p-8 rounded-lg border border-border">
        <h1 className="font-display text-3xl mb-6 text-center">Welcome to StreamFlix</h1>

        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="space-y-4">
            <Field label="Email" value={email} onChange={setEmail} type="email" />
            <Field label="Password" value={password} onChange={setPassword} type="password" />
            <Button onClick={signIn} disabled={loading} className="w-full bg-primary hover:bg-primary/90">
              Sign in
            </Button>
          </TabsContent>
          <TabsContent value="signup" className="space-y-4">
            <Field label="Name" value={name} onChange={setName} />
            <Field label="Email" value={email} onChange={setEmail} type="email" />
            <Field label="Password" value={password} onChange={setPassword} type="password" />
            <Button onClick={signUp} disabled={loading} className="w-full bg-primary hover:bg-primary/90">
              Create account
            </Button>
          </TabsContent>
        </Tabs>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
        </div>

        <Button onClick={signInGoogle} variant="outline" className="w-full">
          Continue with Google
        </Button>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}