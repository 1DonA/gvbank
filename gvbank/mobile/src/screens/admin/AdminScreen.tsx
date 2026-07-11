import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, Alert, ActivityIndicator, RefreshControl
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAPI } from '../../services/api'

const C = { navy:'#0a1628', gold:'#c9a84c', white:'#fff', gray:'#9a9589', bg:'#f8f7f4', border:'#e4e2dc', green:'#1a7a4a', red:'#c0392b' }
const fmt = (n:number) => '$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2})

type Tab = 'overview'|'users'|'transactions'

export function AdminScreen() {
  const [tab, setTab] = useState<Tab>('overview')
  const [txFilter, setTxFilter] = useState<string|undefined>(undefined)
  const qc = useQueryClient()

  const { data: stats, refetch: refetchStats } = useQuery({ queryKey:['admin-stats'], queryFn:()=>adminAPI.stats().then(r=>r.data) })
  const { data: users=[], refetch: refetchUsers } = useQuery({ queryKey:['admin-users'], queryFn:()=>adminAPI.users().then(r=>r.data), enabled:tab==='users' })
  const { data: txs=[], refetch: refetchTxs, isLoading: txLoading } = useQuery({
    queryKey:['admin-tx', txFilter],
    queryFn:()=>adminAPI.transactions(txFilter).then(r=>r.data),
    enabled: tab==='transactions'||tab==='overview'
  })

  const blockUser = useMutation({
    mutationFn:(id:string)=>adminAPI.blockUser(id),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['admin-users']}); refetchStats() }
  })

  const moderateTx = useMutation({
    mutationFn:({id,action}:{id:string,action:string})=>adminAPI.moderateTx(id,action),
    onSuccess:(_,v)=>{ qc.invalidateQueries({queryKey:['admin-tx']}); refetchStats(); Alert.alert('Done',`Transaction ${v.action}d`) }
  })

  const onRefresh = () => { refetchStats(); if(tab==='users') refetchUsers(); if(tab==='transactions'||tab==='overview') refetchTxs() }

  const pendingTxs = txs.filter((t:any)=>t.status==='pending'||t.status==='held')

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={C.gold}/>}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Admin Dashboard</Text>
        <View style={s.warningBadge}><Text style={s.warningText}>⚠ Restricted</Text></View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={{paddingHorizontal:16,gap:8}}>
        {(['overview','users','transactions'] as Tab[]).map(t=>(
          <TouchableOpacity key={t} onPress={()=>setTab(t)}
            style={[s.tabBtn, tab===t&&s.tabBtnActive]}>
            <Text style={[s.tabText, tab===t&&{color:'#fff'}]}>{t.charAt(0).toUpperCase()+t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Overview */}
      {tab==='overview' && (
        <View style={{padding:16,gap:16}}>
          <View style={s.statsGrid}>
            {[
              {label:'Customers', value:stats?.total_customers??'—', icon:'👥', bg:'#e8f0fe'},
              {label:'Total Assets', value:stats?fmt(stats.total_assets):'—', icon:'💰', bg:'#e8f8ef'},
              {label:'Pending Reviews', value:stats?.pending_reviews??'—', icon:'⏸', bg:'#fff8e6'},
              {label:'Total Txs', value:stats?.total_transactions??'—', icon:'📋', bg:'#f3e8fe'},
            ].map(st=>(
              <View key={st.label} style={s.statCard}>
                <View style={[s.statIcon,{backgroundColor:st.bg}]}><Text style={{fontSize:18}}>{st.icon}</Text></View>
                <Text style={s.statValue}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          <Text style={s.sectionTitle}>Pending Actions</Text>
          {pendingTxs.length===0 && <Text style={s.emptyText}>No pending transactions 🎉</Text>}
          {pendingTxs.slice(0,5).map((tx:any)=>(
            <TxCard key={tx.id} tx={tx}
              onApprove={()=>moderateTx.mutate({id:tx.id,action:'approve'})}
              onHold={()=>moderateTx.mutate({id:tx.id,action:'hold'})}
              onReject={()=>Alert.alert('Reject Transaction','Are you sure?',[
                {text:'Cancel'},{text:'Reject',style:'destructive',onPress:()=>moderateTx.mutate({id:tx.id,action:'reject'})}
              ])}/>
          ))}
        </View>
      )}

      {/* Users */}
      {tab==='users' && (
        <View style={{padding:16,gap:12}}>
          <Text style={s.sectionTitle}>All Customers ({users.length})</Text>
          {users.map((u:any)=>(
            <View key={u.id} style={s.userCard}>
              <View style={s.userAvatar}>
                <Text style={s.userAvatarText}>{u.name.split(' ').map((n:string)=>n[0]).join('')}</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={s.userName}>{u.name}</Text>
                <Text style={s.userEmail} numberOfLines={1}>{u.email}</Text>
                <Text style={s.userBalance}>{fmt(u.total_balance)}</Text>
              </View>
              <View style={{alignItems:'flex-end',gap:8}}>
                <View style={[s.statusBadge,{backgroundColor:u.is_active?'#e8f8ef':'#fee8e8'}]}>
                  <Text style={{fontSize:11,fontWeight:'600',color:u.is_active?C.green:C.red}}>{u.is_active?'Active':'Blocked'}</Text>
                </View>
                <TouchableOpacity onPress={()=>blockUser.mutate(u.id)}
                  style={[s.actionSmBtn,{backgroundColor:u.is_active?'#fee8e8':'#e8f8ef'}]}>
                  <Text style={{fontSize:12,fontWeight:'600',color:u.is_active?C.red:C.green}}>{u.is_active?'🚫 Block':'✓ Unblock'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {users.length===0 && <ActivityIndicator color={C.navy}/>}
        </View>
      )}

      {/* Transactions */}
      {tab==='transactions' && (
        <View style={{padding:16,gap:12}}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingBottom:4}}>
            {[undefined,'pending','held','completed','rejected'].map(f=>(
              <TouchableOpacity key={String(f)} onPress={()=>setTxFilter(f)}
                style={[s.filterChip, txFilter===f&&s.filterChipActive]}>
                <Text style={[s.filterText, txFilter===f&&{color:'#fff'}]}>{f?f.charAt(0).toUpperCase()+f.slice(1):'All'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {txLoading && <ActivityIndicator color={C.navy} style={{marginTop:20}}/>}
          {txs.map((tx:any)=>(
            <TxCard key={tx.id} tx={tx}
              onApprove={()=>moderateTx.mutate({id:tx.id,action:'approve'})}
              onHold={()=>moderateTx.mutate({id:tx.id,action:'hold'})}
              onReject={()=>Alert.alert('Reject?','',[ {text:'Cancel'},{text:'Reject',style:'destructive',onPress:()=>moderateTx.mutate({id:tx.id,action:'reject'})} ])}/>
          ))}
          {txs.length===0&&!txLoading && <Text style={s.emptyText}>No transactions</Text>}
        </View>
      )}
    </ScrollView>
  )
}

function TxCard({ tx, onApprove, onHold, onReject }:{ tx:any; onApprove:()=>void; onHold:()=>void; onReject:()=>void }) {
  const isActionable = tx.status==='pending'||tx.status==='held'
  const statusColors:any = { completed:'#1a7a4a', pending:'#b8860b', held:'#7d3b8a', rejected:'#c0392b', failed:'#c0392b' }
  const statusBg:any     = { completed:'#e8f8ef', pending:'#fff8e6', held:'#fde8fe', rejected:'#fee8e8', failed:'#fee8e8' }
  return (
    <View style={s.txCard}>
      <View style={s.txCardTop}>
        <View style={{flex:1}}>
          <Text style={s.txDesc} numberOfLines={1}>{tx.description}</Text>
          <Text style={s.txUser}>{tx.user} · {new Date(tx.created_at).toLocaleDateString()}</Text>
        </View>
        <View style={{alignItems:'flex-end',gap:4}}>
          <Text style={[s.txAmt,{color:tx.amount<0?C.red:C.green}]}>{tx.amount>0?'+':''}{fmt(tx.amount)}</Text>
          <View style={[s.statusBadge,{backgroundColor:statusBg[tx.status]||'#f2f1ee'}]}>
            <Text style={{fontSize:10,fontWeight:'600',color:statusColors[tx.status]||C.gray}}>{tx.status}</Text>
          </View>
        </View>
      </View>
      {isActionable && (
        <View style={s.txActions}>
          <TouchableOpacity style={[s.txBtn,{backgroundColor:'#e8f8ef'}]} onPress={onApprove}>
            <Text style={[s.txBtnText,{color:C.green}]}>✓ Approve</Text>
          </TouchableOpacity>
          {tx.status==='pending' && (
            <TouchableOpacity style={[s.txBtn,{backgroundColor:'#fde8fe'}]} onPress={onHold}>
              <Text style={[s.txBtnText,{color:'#7d3b8a'}]}>⏸ Hold</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.txBtn,{backgroundColor:'#fee8e8'}]} onPress={onReject}>
            <Text style={[s.txBtnText,{color:C.red}]}>✕ Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container:    { flex:1, backgroundColor:C.bg },
  header:       { backgroundColor:C.navy, padding:24, paddingTop:52, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  headerTitle:  { color:'#fff', fontSize:22, fontWeight:'700', fontFamily:Platform.OS==='ios'?'Georgia':'serif' },
  warningBadge: { backgroundColor:'rgba(192,57,43,0.2)', paddingHorizontal:10, paddingVertical:4, borderRadius:100 },
  warningText:  { color:'#ff8a80', fontSize:11, fontWeight:'600' },
  tabBar:       { backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:C.border, paddingVertical:10 },
  tabBtn:       { paddingHorizontal:16, paddingVertical:8, borderRadius:100, backgroundColor:'#f2f1ee', borderWidth:1, borderColor:C.border },
  tabBtnActive: { backgroundColor:C.navy, borderColor:C.navy },
  tabText:      { fontSize:13, fontWeight:'600', color:C.gray },
  statsGrid:    { flexDirection:'row', flexWrap:'wrap', gap:10 },
  statCard:     { flex:1, minWidth:'45%', backgroundColor:'#fff', borderRadius:16, padding:16, borderWidth:1, borderColor:C.border },
  statIcon:     { width:40, height:40, borderRadius:12, alignItems:'center', justifyContent:'center', marginBottom:10 },
  statValue:    { fontSize:22, fontWeight:'700', color:'#1a1714', fontFamily:Platform.OS==='ios'?'Georgia':'serif' },
  statLabel:    { fontSize:11, color:C.gray, marginTop:2 },
  sectionTitle: { fontSize:16, fontWeight:'700', color:'#1a1714' },
  emptyText:    { textAlign:'center', color:C.gray, padding:24, fontSize:14 },
  userCard:     { backgroundColor:'#fff', borderRadius:16, padding:16, flexDirection:'row', alignItems:'center', gap:12, borderWidth:1, borderColor:C.border },
  userAvatar:   { width:44, height:44, borderRadius:22, backgroundColor:C.navy, alignItems:'center', justifyContent:'center' },
  userAvatarText:{ color:'#fff', fontWeight:'700', fontSize:14 },
  userName:     { fontSize:14, fontWeight:'700', color:'#1a1714', marginBottom:2 },
  userEmail:    { fontSize:12, color:C.gray, marginBottom:4 },
  userBalance:  { fontSize:13, fontWeight:'600', color:C.navy, fontFamily:'monospace' },
  statusBadge:  { paddingHorizontal:8, paddingVertical:3, borderRadius:100 },
  actionSmBtn:  { paddingHorizontal:10, paddingVertical:5, borderRadius:8 },
  txCard:       { backgroundColor:'#fff', borderRadius:16, padding:16, borderWidth:1, borderColor:C.border },
  txCardTop:    { flexDirection:'row', alignItems:'flex-start', gap:10 },
  txDesc:       { fontSize:13, fontWeight:'600', color:'#1a1714', marginBottom:4 },
  txUser:       { fontSize:11, color:C.gray },
  txAmt:        { fontSize:15, fontWeight:'700', fontFamily:'monospace' },
  txActions:    { flexDirection:'row', gap:8, marginTop:12, flexWrap:'wrap' },
  txBtn:        { paddingHorizontal:12, paddingVertical:7, borderRadius:8 },
  txBtnText:    { fontSize:12, fontWeight:'700' },
  filterChip:   { paddingHorizontal:14, paddingVertical:7, borderRadius:100, backgroundColor:'#f2f1ee', borderWidth:1, borderColor:C.border },
  filterChipActive:{ backgroundColor:C.navy, borderColor:C.navy },
  filterText:   { fontSize:13, fontWeight:'600', color:C.gray },
})
