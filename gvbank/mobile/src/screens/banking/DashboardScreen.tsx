import React from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, RefreshControl
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { accountsAPI } from '../../services/api'
import { useNavigation } from '@react-navigation/native'

const C = { navy:'#0a1628', gold:'#c9a84c', white:'#fff', gray:'#9a9589', bg:'#f8f7f4', green:'#1a7a4a', red:'#c0392b' }
const fmt = (n: number) => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits:2 })

export function DashboardScreen({ user }: { user: any }) {
  const nav = useNavigation<any>()
  const { data: accounts=[], refetch: refetchA, isLoading: loadA } = useQuery({ queryKey:['accounts'], queryFn:()=>accountsAPI.list().then(r=>r.data) })
  const { data: txs=[], refetch: refetchT, isLoading: loadT } = useQuery({ queryKey:['all-tx'], queryFn:()=>accountsAPI.allTransactions().then(r=>r.data) })

  const total = accounts.reduce((s:number, a:any) => s+a.balance, 0)
  const checking = accounts.find((a:any)=>a.type==='checking')
  const savings  = accounts.find((a:any)=>a.type==='savings')

  const onRefresh = () => { refetchA(); refetchT() }

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loadA||loadT} onRefresh={onRefresh} tintColor={C.gold}/>}>

      {/* Hero */}
      <View style={s.hero}>
        <Text style={s.heroGreet}>Good morning,</Text>
        <Text style={s.heroName}>{user?.name?.split(' ')[0]} 👋</Text>
        <Text style={s.heroLabel}>TOTAL PORTFOLIO</Text>
        <Text style={s.heroBalance}>{fmt(total)}</Text>
      </View>

      {/* Account cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.cardScroll} contentContainerStyle={{paddingHorizontal:20,gap:12}}>
        {checking && (
          <View style={[s.acctCard,{backgroundColor:'#112240'}]}>
            <Text style={s.acctType}>CHECKING</Text>
            <Text style={s.acctBalance}>{fmt(checking.balance)}</Text>
            <Text style={s.acctNum}>{checking.number}</Text>
          </View>
        )}
        {savings && (
          <View style={[s.acctCard,{backgroundColor:'#1a4a3a'}]}>
            <Text style={s.acctType}>SAVINGS · {savings.apy}% APY</Text>
            <Text style={s.acctBalance}>{fmt(savings.balance)}</Text>
            <Text style={s.acctNum}>{savings.number}</Text>
          </View>
        )}
      </ScrollView>

      {/* Quick actions */}
      <View style={s.quickRow}>
        {[
          { icon:'💸', label:'Send', onPress:()=>nav.navigate('Transfer') },
          { icon:'📥', label:'Deposit', onPress:()=>{} },
          { icon:'📋', label:'History', onPress:()=>nav.navigate('Statements') },
          { icon:'💳', label:'Cards', onPress:()=>nav.navigate('Cards') },
        ].map(q=>(
          <TouchableOpacity key={q.label} style={s.quickItem} onPress={q.onPress}>
            <View style={s.quickIcon}><Text style={{fontSize:22}}>{q.icon}</Text></View>
            <Text style={s.quickLabel}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transactions */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={()=>nav.navigate('Statements')}>
            <Text style={{color:C.navy,fontSize:13,fontWeight:'600'}}>View all</Text>
          </TouchableOpacity>
        </View>
        {txs.slice(0,8).map((tx:any)=>(
          <View key={tx.id} style={s.txRow}>
            <View style={[s.txIcon,{backgroundColor:tx.amount>0?'#e8f8ef':'#f2f1ee'}]}>
              <Text style={{fontSize:18}}>{tx.amount>0?'💰':tx.category==='transfer'?'💸':'🛒'}</Text>
            </View>
            <View style={{flex:1}}>
              <Text style={s.txName} numberOfLines={1}>{tx.description}</Text>
              <Text style={s.txDate}>{new Date(tx.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={{alignItems:'flex-end'}}>
              <Text style={[s.txAmt,{color:tx.amount>0?C.green:C.navy}]}>
                {tx.amount>0?'+':''}{fmt(tx.amount)}
              </Text>
              <View style={[s.statusBadge,
                tx.status==='completed'?{backgroundColor:'#e8f8ef'}:
                tx.status==='pending'?{backgroundColor:'#fff8e6'}:
                tx.status==='held'?{backgroundColor:'#fde8fe'}:{backgroundColor:'#fee8e8'}]}>
                <Text style={[s.statusText,
                  tx.status==='completed'?{color:C.green}:
                  tx.status==='pending'?{color:'#b8860b'}:
                  tx.status==='held'?{color:'#7d3b8a'}:{color:C.red}]}>
                  {tx.status}
                </Text>
              </View>
            </View>
          </View>
        ))}
        {txs.length===0 && <Text style={{textAlign:'center',color:C.gray,padding:24}}>No transactions yet</Text>}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container:   { flex:1, backgroundColor:C.bg },
  hero:        { backgroundColor:C.navy, padding:28, paddingTop:52 },
  heroGreet:   { color:'rgba(255,255,255,0.5)', fontSize:14, marginBottom:2 },
  heroName:    { color:'#fff', fontSize:26, fontWeight:'700', fontFamily:Platform.OS==='ios'?'Georgia':'serif', marginBottom:20 },
  heroLabel:   { color:'rgba(255,255,255,0.4)', fontSize:10, letterSpacing:3, textTransform:'uppercase', marginBottom:4 },
  heroBalance: { color:'#fff', fontSize:40, fontWeight:'700', fontFamily:Platform.OS==='ios'?'Georgia':'serif' },
  cardScroll:  { marginTop:20 },
  acctCard:    { width:220, borderRadius:18, padding:20 },
  acctType:    { color:'rgba(255,255,255,0.5)', fontSize:10, letterSpacing:2, textTransform:'uppercase', marginBottom:8 },
  acctBalance: { color:'#fff', fontSize:26, fontWeight:'700', fontFamily:Platform.OS==='ios'?'Georgia':'serif', marginBottom:12 },
  acctNum:     { color:'rgba(255,255,255,0.35)', fontSize:12, fontFamily:'monospace' },
  quickRow:    { flexDirection:'row', paddingHorizontal:20, marginTop:20, gap:10 },
  quickItem:   { flex:1, backgroundColor:'#fff', borderRadius:14, padding:14, alignItems:'center', borderWidth:1, borderColor:'#e4e2dc' },
  quickIcon:   { width:44, height:44, backgroundColor:'#f2f1ee', borderRadius:12, alignItems:'center', justifyContent:'center', marginBottom:8 },
  quickLabel:  { fontSize:11, fontWeight:'600', color:'#3a3630' },
  section:     { backgroundColor:'#fff', margin:20, borderRadius:18, overflow:'hidden', borderWidth:1, borderColor:'#e4e2dc' },
  sectionHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:18, borderBottomWidth:1, borderBottomColor:'#f2f1ee' },
  sectionTitle: { fontSize:15, fontWeight:'700', color:'#1a1714' },
  txRow:       { flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1, borderBottomColor:'#f2f1ee' },
  txIcon:      { width:42, height:42, borderRadius:12, alignItems:'center', justifyContent:'center' },
  txName:      { fontSize:13, fontWeight:'600', color:'#1a1714', marginBottom:3 },
  txDate:      { fontSize:11, color:C.gray },
  txAmt:       { fontSize:14, fontWeight:'700', fontFamily:'monospace', marginBottom:3 },
  statusBadge: { paddingHorizontal:8, paddingVertical:2, borderRadius:100 },
  statusText:  { fontSize:10, fontWeight:'600' },
})
