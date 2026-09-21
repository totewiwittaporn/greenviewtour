import { useLocale, t as msg } from "../core/locale.js";import AuthLayout from '../core/AuthLayout.jsx';
import Recovery from './Recovery.jsx';
import { useRef, useState } from 'react';
import { Button, Field, Notice } from '../core/ui.jsx';
import { api, errorText } from '../core/api.js';
export default function Auth({ onLogin }) {useLocale();
  const [recover, setRecover] = useState(false),[register, setRegister] = useState(false),[email, setEmail] = useState(''),[password, setPassword] = useState(''),[confirmation, setConfirmation] = useState(''),[busy, setBusy] = useState(false),[notice, setNotice] = useState(''),[errors, setErrors] = useState({}),lock = useRef(false),form = useRef(null);
  async function submit(e) {
    e.preventDefault();if (lock.current) return;
    const invalid = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invalid.email = msg("กรอกอีเมลให้ถูกต้อง เช่น name@example.com");
    if (!password || register && password.length < 12) invalid.password = register ? msg("ตั้งรหัสผ่านอย่างน้อย 12 ตัวอักษร") : msg("กรอกรหัสผ่านของคุณ");
    if (register && password !== confirmation) invalid.confirmation = msg("กรอกรหัสผ่านให้ตรงกัน");
    setErrors(invalid);setNotice('');
    if (Object.keys(invalid).length) {requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus());return;}
    lock.current = true;setBusy(true);
    try {const r = await api('/api/member/' + (register ? 'register' : 'login'), { email, password });if (register) {setNotice(msg("กรุณาตรวจอีเมลเพื่อยืนยันบัญชี แล้วกลับมาเข้าสู่ระบบ"));setPassword('');setConfirmation('');} else onLogin(r.customer);} catch (e) {setNotice(errorText(e));} finally {setBusy(false);lock.current = false;}
  }
  if (recover) return <AuthLayout><Recovery onBack={() => setRecover(false)} /></AuthLayout>;
  return <AuthLayout><section className="panel auth-panel"><p className="eyebrow">GREENVIEW MEMBER</p><h1>{register ? msg("สมัครสมาชิก") : msg("เข้าสู่ระบบสมาชิก")}</h1><p>{msg("ดูทริปของคุณและส่งคำขอจองทัวร์กับ Greenview Tour")}</p><form ref={form} noValidate onSubmit={submit}><Field label={msg("อีเมล")} type="email" autoComplete="email" value={email} onChange={(e) => {setEmail(e.target.value);setErrors((v) => ({ ...v, email: undefined }));}} error={errors.email} disabled={busy} /><Field label={msg("รหัสผ่าน")} type="password" autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={(e) => {setPassword(e.target.value);setErrors((v) => ({ ...v, password: undefined }));}} error={errors.password} disabled={busy} />{register && <Field label={msg("ยืนยันรหัสผ่าน")} type="password" autoComplete="new-password" value={confirmation} onChange={(e) => {setConfirmation(e.target.value);setErrors((v) => ({ ...v, confirmation: undefined }));}} error={errors.confirmation} disabled={busy} />}<Notice>{notice}</Notice><Button className="auth-primary" type="submit" busy={busy} disabled={busy}>{register ? msg("สมัครสมาชิก") : msg("เข้าสู่ระบบ")}</Button></form>{!register && <Button className="auth-text-button" disabled={busy} onClick={() => setRecover(true)}>{msg("ลืมรหัสผ่าน")}</Button>}<Button className="secondary" disabled={busy} onClick={() => {setRegister(!register);setNotice('');setErrors({});setPassword('');setConfirmation('');}}>{register ? msg("มีบัญชีแล้ว เข้าสู่ระบบ") : msg("ยังไม่มีบัญชี สมัครสมาชิก")}</Button></section></AuthLayout>;
}
