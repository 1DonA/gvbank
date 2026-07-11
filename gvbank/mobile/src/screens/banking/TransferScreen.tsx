import React, { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Alert, ActivityIndicator, KeyboardAvoidingView
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { accountsAPI, transferAPI, authAPI } from '../../services/api'

const C = { navy:'#0a1628', gold:'#c9a84c', white:'#fff', gray:'#9a9589', bg:'#f8f7f4', border:'#e4e2dc', green:'#1a7a4a', red:'#c0392b' }
const fmt = (n:number) => '$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2})

const EXTERNAL = ['Chase Bank — ****2391','Bank of America — ****8812','Wells Fargo — ****5541','Zelle Contact']

type Step = 'form'|'otp'|'done'

export function TransferScreen({ user }: { user:any }) {
  const [step, setStep] = useState<Step>('form')
  const [fromId, setFromId] = useState('')
  const [toDest, setToDest] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [txRef, setTxRef] = useState('')
  const [otp, setOtp] = useState(['','','','','',''])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const otpRefs = Array.from({length:6}, ()=>useRef<TextInput>(null))

  const { data: accounts=[] } = useQuery({ queryKey:['accounts'], queryFn:()=>accountsAPI.list().then(r=>r.data) })
  const checking = accounts.find((a:any)=>a.type==='checking')

  const handleOTPChange = (i:number, v:string) => {
    if(!/^\d*$/.test(v)) return
    const next=[...otp]; next[i]=v.slice(-1); setOtp(next)
    if(v&&i<5) otpRefs[i+1].current?.focus()
    if(i===5&&v) setTimeout(verifyOTP,200)
  }
  const handleOTPKey = (i:number, key:string) => {
    if(key==='Backspace'&&!otp[i]&&i>0) otpRefs[i-1].current?.focus()
  }

  const submit = async () => {
    if(!fromId||!toDest||!amount) { Alert.alert('Error','Please fill all fields'); return }
    const amt = parseFloat(amount)
    if(isNaN(amt)||amt<=0) { Alert.alert('Error','Enter a valid amount'); return }
    if(checking && amt>checking.balance) { Alert.alert('Insufficient Funds',`Available: ${fmt(checking.balance)}`); return }
    setLoading(true)
    try {
      const res = await transferAPI.initiate({ from_account_id:fromId, to_destination:toDest, amount:amt, memo })
      setTxRef(res.data.transfer_ref)
      setStep('otp')
      Alert.alert('OTP Sent', res.data.message)
    } catch(e:any) { Alert.alert('Error', e.response?.data?.detail||'Failed to initiate') }
    finally { setLoading(false) }
  }

  const verifyOTP = async () => {
    const code = otp.join('')
    if(code.length<6) { Alert.alert('Error','Enter complete 6-digit code'); return }
    setLoading(true)
    try {
      const res = await transferAPI.verify({ transfer_ref:txRef, otp_code:code })
      setResult(res.data)
      setStep('done')
    } catch(e:any) {
      Alert.alert('Invalid Code', e.response?.data?.detail||'Wrong OTP')
      setOtp(['','','','','',''])
      otpRefs[0].current?.focus()
    } finally { setLoading(false) }
  }

  const reset = () => { setStep('form'); setAmount(''); setMemo(''); setFromId(''); setToDest(''); setOtp(['','','','','','']); setResult(null) }

  return (
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
      <ScrollView style={s.container} contentContainerStyle={{padding:20}} keyboardShouldPersistTaps="handled">
        <Text style={s.pageTitle}>Send Money</Text>

        {step==='form' && (
          <View style={s.card}>
            <Text style={s.label}>FROM ACCOUNT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:16}}>
              {accounts.map((a:any)=>(
                <TouchableOpacity key={a.id} onPress={()=>setFromId(a.id)}
                  style={[s.acctChip, fromId===a.id&&s.acctChipActive]}>
                  <Text style={[s.acctChipText, fromId===a.id&&{color:'#fff'}]}>{a.type.charAt(0).toUpperCase()+a.type.slice(1)}</Text>
                  <Text style={[{fontSize:11,marginTop:2,fontFamily:'monospace'}, fromId===a.id?{color:'rgba(255,255,255,0.7)'}:{color:C.gray}]}>{fmt(a.balance)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.label}>TRANSFER TO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:16}}>
              {EXTERNAL.map(d=>(
                <TouchableOpacity key={d} onPress={()=>setToDest(d)}
                  style={[s.destChip, toDest===d&&s.acctChipActive]}>
                  <Text style={[s.destChipText, toDest===d&&{color:'#fff'}]} numberOfLines={1}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.label}>AMOUNT</Text>
            <View style={s.amtWrap}>
              <Text style={s.amtPrefix}>$</Text>
              <TextInput style={s.amtInput} value={amount} onChangeText={setAmount}
                keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={C.gray}/>
            </View>
            {checking && <Text style={s.hint}>Available: {fmt(checking.balance)}</Text>}

            <Text style={[s.label,{marginTop:16}]}>MEMO (OPTIONAL)</Text>
            <TextInput style={s.input} value={memo} onChangeText={setMemo} placeholder="Rent, groceries..." placeholderTextColor={C.gray}/>

            <TouchableOpacity style={[s.btn,(!fromId||!toDest||!amount)&&{opacity:0.5}]} onPress={submit} disabled={loading||!fromId||!toDest||!amount}>
              {loading?<ActivityIndicator color="#fff"/>:<Text style={s.btnText}>Review &amp; Send →</Text>}
            </TouchableOpacity>
          </View>
        )}

        {step==='otp' && (
          <View style={s.card}>
            <TouchableOpacity onPress={()=>setStep('form')} style={{marginBottom:16}}>
              <Text style={{color:C.gray,fontSize:13}}>← Back</Text>
            </TouchableOpacity>
            <View style={{alignItems:'center',marginBottom:8}}>
              <Text style={{fontSize:40,marginBottom:12}}>🔐</Text>
              <Text style={s.otpTitle}>Authorise Transfer</Text>
            </View>
            <View style={s.summaryBox}>
              <View style={s.summaryRow}><Text style={s.summaryLabel}>To</Text><Text style={s.summaryVal} numberOfLines={1}>{toDest}</Text></View>
              <View style={[s.summaryRow,{borderBottomWidth:0,marginTop:4}]}>
                <Text style={[s.summaryLabel,{fontWeight:'700'}]}>Amount</Text>
                <Text style={[s.summaryVal,{color:C.red,fontWeight:'700',fontSize:16}]}>{fmt(parseFloat(amount||'0'))}</Text>
              </View>
            </View>
            <Text style={[s.sub,{textAlign:'center',marginTop:12}]}>Enter the code sent to your email &amp; phone</Text>
            <View style={s.otpRow}>
              {otp.map((v,i)=>(
                <TextInput key={i} ref={otpRefs[i]} style={[s.otpBox,v&&s.otpFilled]}
                  value={v} onChangeText={t=>handleOTPChange(i,t)}
                  onKeyPress={({nativeEvent})=>handleOTPKey(i,nativeEvent.key)}
                  keyboardType="number-pad" maxLength={1} selectTextOnFocus/>
              ))}
            </View>
            <TouchableOpacity style={[s.btn,otp.join('').length<6&&{opacity:0.5}]}
              onPress={verifyOTP} disabled={loading||otp.join('').length<6}>
              {loading?<ActivityIndicator color="#fff"/>:<Text style={s.btnText}>Confirm Transfer →</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>authAPI.resendOTP(user?.email||'','transfer').then(()=>Alert.alert('Sent!','New OTP sent'))}
              style={{marginTop:14,alignItems:'center'}}>
              <Text style={{color:C.navy,fontSize:13,fontWeight:'600'}}>Resend code</Text>
            </TouchableOpacity>
          </View>
        )}

        {step==='done' && result && (
          <View style={[s.card,{alignItems:'center'}]}>
            <Text style={{fontSize:60,marginBottom:16}}>✅</Text>
            <Text style={[s.otpTitle,{color:C.green}]}>Transfer Complete!</Text>
            <Text style={{color:C.gray,fontSize:14,marginTop:6,marginBottom:20}}>{fmt(result.amount)} sent successfully</Text>
            <View style={s.summaryBox}>
              <View style={s.summaryRow}><Text style={s.summaryLabel}>New Balance</Text><Text style={s.summaryVal}>{fmt(result.new_balance)}</Text></View>
              <View style={[s.summaryRow,{borderBottomWidth:0}]}><Text style={s.summaryLabel}>Ref</Text><Text style={[s.summaryVal,{fontFamily:'monospace',fontSize:11}]}>{result.transaction_id?.slice(0,16)}…</Text></View>
            </View>
            <TouchableOpacity style={[s.btn,{marginTop:20}]} onPress={reset}>
              <Text style={s.btnText}>Make Another Transfer</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container:  { flex:1, backgroundColor:C.bg },
  pageTitle:  { fontSize:24, fontWeight:'700', color:'#1a1714', fontFamily:Platform.OS==='ios'?'Georgia':'serif', marginBottom:16 },
  card:       { backgroundColor:'#fff', borderRadius:20, padding:22, borderWidth:1, borderColor:C.border },
  label:      { fontSize:10, fontWeight:'700', color:C.gray, letterSpacing:2, textTransform:'uppercase', marginBottom:10 },
  input:      { borderWidth:1.5, borderColor:C.border, borderRadius:10, padding:13, fontSize:14, color:'#1a1714', marginBottom:0 },
  acctChip:   { backgroundColor:'#f2f1ee', borderRadius:12, padding:12, marginRight:10, minWidth:120, borderWidth:1.5, borderColor:C.border },
  acctChipActive:{ backgroundColor:C.navy, borderColor:C.navy },
  acctChipText:  { fontSize:13, fontWeight:'600', color:'#3a3630' },
  destChip:      { backgroundColor:'#f2f1ee', borderRadius:10, paddingHorizontal:14, paddingVertical:10, marginRight:10, borderWidth:1.5, borderColor:C.border, maxWidth:180 },
  destChipText:  { fontSize:12, fontWeight:'500', color:'#3a3630' },
  amtWrap:    { flexDirection:'row', alignItems:'center', borderWidth:1.5, borderColor:C.border, borderRadius:10, paddingHorizontal:14, marginBottom:4 },
  amtPrefix:  { fontSize:22, fontWeight:'700', color:C.gray, marginRight:6 },
  amtInput:   { flex:1, fontSize:28, fontWeight:'700', color:'#1a1714', paddingVertical:12, fontFamily:Platform.OS==='ios'?'Georgia':'serif' },
  hint:       { fontSize:12, color:C.gray, marginBottom:16 },
  btn:        { backgroundColor:C.navy, borderRadius:12, padding:16, alignItems:'center', marginTop:20 },
  btnText:    { color:'#fff', fontWeight:'600', fontSize:15 },
  otpTitle:   { fontSize:20, fontWeight:'700', color:'#1a1714', fontFamily:Platform.OS==='ios'?'Georgia':'serif', textAlign:'center' },
  sub:        { fontSize:13, color:C.gray, marginBottom:4 },
  otpRow:     { flexDirection:'row', justifyContent:'center', gap:10, marginVertical:20 },
  otpBox:     { width:44, height:54, borderWidth:1.5, borderColor:C.border, borderRadius:10, textAlign:'center', fontSize:22, fontWeight:'700', color:C.navy },
  otpFilled:  { borderColor:C.navy, backgroundColor:'#eef2f9' },
  summaryBox: { backgroundColor:'#f8f7f4', borderRadius:12, padding:16, width:'100%' },
  summaryRow: { flexDirection:'row', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:1, borderBottomColor:'#e4e2dc' },
  summaryLabel:{ fontSize:13, color:C.gray },
  summaryVal:  { fontSize:14, fontWeight:'600', color:'#1a1714', flex:1, textAlign:'right', marginLeft:8 },
})
