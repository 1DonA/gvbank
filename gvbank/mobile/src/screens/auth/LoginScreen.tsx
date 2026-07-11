import React, { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { authAPI } from '../services/api'
import { useNavigation } from '@react-navigation/native'

const C = { navy: '#0a1628', gold: '#c9a84c', white: '#fff', gray: '#9a9589', bg: '#f8f7f4', border: '#e4e2dc' }

export function LoginScreen() {
  const [step, setStep]       = useState<'creds'|'otp'>('creds')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp]         = useState(['','','','','',''])
  const [loading, setLoading] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const otpRefs = Array.from({length:6}, () => useRef<TextInput>(null))
  const nav = useNavigation<any>()

  const handleOTPChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return
    const next = [...otp]; next[i] = v.slice(-1); setOtp(next)
    if (v && i < 5) otpRefs[i+1].current?.focus()
    if (i === 5 && v) setTimeout(verifyOTP, 200)
  }

  const handleOTPKey = (i: number, key: string) => {
    if (key === 'Backspace' && !otp[i] && i > 0) otpRefs[i-1].current?.focus()
  }

  const submitCreds = async () => {
    if (!email || !password) { Alert.alert('Error','Enter email and password'); return }
    setLoading(true)
    try {
      const res = await authAPI.loginInit({ email, password })
      if (!res.data.requires_otp) {
        await SecureStore.setItemAsync('gv_token', res.data.access_token)
        await SecureStore.setItemAsync('gv_user', JSON.stringify(res.data.user))
        nav.replace('AdminDashboard')
        return
      }
      setPendingEmail(email)
      setStep('otp')
      Alert.alert('OTP Sent', res.data.message)
    } catch (e: any) {
      Alert.alert('Login Failed', e.response?.data?.detail || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  const verifyOTP = async () => {
    const code = otp.join('')
    if (code.length < 6) { Alert.alert('Error','Enter the complete 6-digit code'); return }
    setLoading(true)
    try {
      const res = await authAPI.loginVerify({ email: pendingEmail, code, purpose: 'login' })
      await SecureStore.setItemAsync('gv_token', res.data.access_token)
      await SecureStore.setItemAsync('gv_user', JSON.stringify(res.data.user))
      nav.replace(res.data.user.role === 'admin' ? 'AdminDashboard' : 'MainTabs')
    } catch (e: any) {
      Alert.alert('Wrong Code', e.response?.data?.detail || 'Invalid or expired OTP')
      setOtp(['','','','','',''])
      otpRefs[0].current?.focus()
    } finally { setLoading(false) }
  }

  const resend = async () => {
    try {
      await authAPI.resendOTP(pendingEmail, 'login')
      Alert.alert('Sent!', 'New OTP sent to your email and phone')
    } catch { Alert.alert('Error','Failed to resend') }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS==='ios'?'padding':undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoMark}><Text style={s.logoLetter}>G</Text></View>
          <Text style={s.logoText}>GV Union Bank</Text>
          <Text style={s.logoSub}>MEMBER FDIC</Text>
        </View>

        <View style={s.card}>
          {step === 'creds' ? (
            <>
              <Text style={s.title}>Welcome back</Text>
              <Text style={s.sub}>Sign in to your account</Text>
              <Text style={s.label}>EMAIL ADDRESS</Text>
              <TextInput style={s.input} value={email} onChangeText={setEmail}
                keyboardType="email-address" autoCapitalize="none" placeholder="your@email.com"
                placeholderTextColor={C.gray} autoComplete="email"/>
              <Text style={s.label}>PASSWORD</Text>
              <TextInput style={s.input} value={password} onChangeText={setPassword}
                secureTextEntry placeholder="••••••••" placeholderTextColor={C.gray}/>
              <TouchableOpacity style={s.btn} onPress={submitCreds} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff"/> : <Text style={s.btnText}>Continue →</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => nav.navigate('AdminLogin')} style={{marginTop:16,alignItems:'center'}}>
                <Text style={{color:C.gray,fontSize:13}}>Admin Portal →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => setStep('creds')} style={{marginBottom:16}}>
                <Text style={{color:C.gray,fontSize:13}}>← Back</Text>
              </TouchableOpacity>
              <Text style={[s.title,{textAlign:'center'}]}>🔐 Verify Identity</Text>
              <Text style={[s.sub,{textAlign:'center'}]}>6-digit code sent to your email &amp; phone</Text>
              <Text style={[s.sub,{textAlign:'center',fontSize:12,marginTop:4}]}>{pendingEmail}</Text>
              <View style={s.otpRow}>
                {otp.map((v,i) => (
                  <TextInput key={i} ref={otpRefs[i]} style={[s.otpBox, v?s.otpFilled:null]}
                    value={v} onChangeText={t=>handleOTPChange(i,t)}
                    onKeyPress={({nativeEvent})=>handleOTPKey(i,nativeEvent.key)}
                    keyboardType="number-pad" maxLength={1} selectTextOnFocus/>
                ))}
              </View>
              <TouchableOpacity style={s.btn} onPress={verifyOTP} disabled={loading||otp.join('').length<6}>
                {loading ? <ActivityIndicator color="#fff"/> : <Text style={s.btnText}>Verify & Sign In →</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={resend} style={{marginTop:14,alignItems:'center'}}>
                <Text style={{color:C.navy,fontSize:13,fontWeight:'600'}}>Resend code</Text>
              </TouchableOpacity>
              <Text style={{textAlign:'center',color:C.gray,fontSize:11,marginTop:6}}>Code expires in 10 minutes</Text>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor: C.navy },
  scroll:    { flexGrow:1, alignItems:'center', justifyContent:'center', padding:24 },
  logoWrap:  { alignItems:'center', marginBottom:28 },
  logoMark:  { width:60,height:60,borderRadius:16,backgroundColor:C.gold,alignItems:'center',justifyContent:'center',marginBottom:10 },
  logoLetter:{ fontSize:28,fontWeight:'700',color:C.navy },
  logoText:  { fontSize:20,fontWeight:'700',color:'#fff',fontFamily:Platform.OS==='ios'?'Georgia':'serif' },
  logoSub:   { fontSize:10,color:C.gold,letterSpacing:3,marginTop:3 },
  card:      { backgroundColor:'#fff',borderRadius:24,padding:28,width:'100%',maxWidth:400 },
  title:     { fontSize:24,fontWeight:'700',color:C.navy,marginBottom:6,fontFamily:Platform.OS==='ios'?'Georgia':'serif' },
  sub:       { fontSize:14,color:C.gray,marginBottom:24 },
  label:     { fontSize:11,fontWeight:'700',color:C.gray,letterSpacing:2,textTransform:'uppercase',marginBottom:8 },
  input:     { borderWidth:1.5,borderColor:C.border,borderRadius:10,padding:13,fontSize:15,color:'#1a1714',marginBottom:16 },
  btn:       { backgroundColor:C.navy,borderRadius:12,padding:16,alignItems:'center',marginTop:4 },
  btnText:   { color:'#fff',fontWeight:'600',fontSize:15 },
  otpRow:    { flexDirection:'row',justifyContent:'center',gap:10,marginVertical:24 },
  otpBox:    { width:46,height:56,borderWidth:1.5,borderColor:C.border,borderRadius:10,textAlign:'center',fontSize:24,fontWeight:'700',color:C.navy },
  otpFilled: { borderColor:C.navy,backgroundColor:'#eef2f9' },
})
