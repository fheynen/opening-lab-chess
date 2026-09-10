"use client";

import { Check, Eye, EyeOff, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";

export function AuthPanel({ initialMode, returnTo }: { initialMode: "signin" | "signup"; returnTo: string }) {
  const [mode, setMode] = useState(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (mode === "signup" && password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      window.location.assign(returnTo);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  function chooseMode(nextMode: "signin" | "signup") {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmation("");
  }

  return <main className="account-page">
    <section className="account-story">
      <p className="eyebrow">Your private chess workspace</p>
      <h1>One account.<br /><span>Every lesson remembered.</span></h1>
      <p>Create an Opening Lab username to keep game reviews, progress, trends, and personal puzzles together on every device.</p>
      <div className="account-benefits">
        <div><span><ShieldCheck size={19} /></span><strong>Private by design</strong><small>Your games and training records are visible only inside your account.</small></div>
        <div><span><KeyRound size={19} /></span><strong>Secure sessions</strong><small>Your password is salted and hashed. It is never stored in readable form.</small></div>
        <div><span><Check size={19} /></span><strong>No email required</strong><small>Choose a username and password, then start training.</small></div>
      </div>
    </section>

    <section className="auth-card" aria-labelledby="account-heading">
      <div className="auth-tabs" role="tablist" aria-label="Account action">
        <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "active" : ""} onClick={() => chooseMode("signin")}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => chooseMode("signup")}>Create account</button>
      </div>
      <div className="auth-card-heading">
        <span><UserRound size={21} /></span>
        <div><p className="eyebrow">Opening Lab account</p><h2 id="account-heading">{mode === "signup" ? "Create your account" : "Welcome back"}</h2></div>
      </div>
      <form onSubmit={submit}>
        <label>Username<input name="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" required spellCheck={false} placeholder="your_username" /></label>
        <label>Password<span className="password-field"><input name="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={10} maxLength={128} required placeholder={mode === "signup" ? "At least 10 characters" : "Your password"} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
        {mode === "signup" && <label>Confirm password<input name="password-confirmation" type={showPassword ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={10} maxLength={128} required placeholder="Repeat your password" /></label>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="primary-action wide auth-submit" disabled={submitting}>{submitting ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
      </form>
      <p className="auth-switch">{mode === "signup" ? "Already have an account?" : "New to Opening Lab?"} <button type="button" onClick={() => chooseMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Sign in" : "Create an account"}</button></p>
      <small className="auth-note">Opening Lab never stores your readable password. Because no email is required, keep your password somewhere safe.</small>
    </section>
  </main>;
}
