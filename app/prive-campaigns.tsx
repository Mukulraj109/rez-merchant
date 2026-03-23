/**
 * Merchant Privé Campaigns Management
 *
 * Merchants can view their campaigns, create new ones, and review post submissions.
 * API: /api/merchant/prive/campaigns, /api/merchant/prive/submissions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, Linking, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/api/apiClient';

interface Campaign {
  _id: string; title: string; status: string; slots: number; slotsUsed: number;
  budget: number; budgetUsed: number; submissionsPending: number;
  submissionsApproved: number; validTo: string;
}

interface Submission {
  _id: string; userName: string; campaignTitle: string; postUrl: string;
  status: string; submittedAt: string; estimatedCashback: number;
}

type TabType = 'campaigns' | 'submissions';

export default function PriveCampaignsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      if (tab === 'campaigns') {
        const res = await apiClient.get('/merchant/prive/campaigns');
        setCampaigns(res.data?.campaigns || []);
      } else {
        const res = await apiClient.get('/merchant/prive/submissions?status=pending');
        setSubmissions(res.data?.submissions || []);
      }
    } catch { /* silently fail */ }
    finally { setIsLoading(false); }
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await apiClient.put(`/merchant/prive/submissions/${id}/approve`, { note: 'Approved by merchant' });
      fetchData();
    } catch {}
    finally { setProcessing(null); }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      await apiClient.put(`/merchant/prive/submissions/${id}/reject`, { reason: 'other', note: 'Rejected by merchant' });
      fetchData();
    } catch {}
    finally { setProcessing(null); }
  };

  const renderCampaign = useCallback(({ item }: { item: Campaign }) => {
    const statusColor = item.status === 'active' ? '#10B981' : item.status === 'pending_approval' ? '#F59E0B' : '#6B7280';
    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[s.badge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[s.badgeText, { color: statusColor }]}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>
        <View style={s.statsGrid}>
          <View style={s.statItem}><Text style={s.statVal}>{item.slotsUsed}/{item.slots}</Text><Text style={s.statLbl}>Slots</Text></View>
          <View style={s.statItem}><Text style={s.statVal}>{item.submissionsPending || 0}</Text><Text style={s.statLbl}>Pending</Text></View>
          <View style={s.statItem}><Text style={s.statVal}>{item.submissionsApproved || 0}</Text><Text style={s.statLbl}>Approved</Text></View>
          <View style={s.statItem}><Text style={s.statVal}>₹{((item.budget - item.budgetUsed) / 1000).toFixed(1)}K</Text><Text style={s.statLbl}>Budget Left</Text></View>
        </View>
      </View>
    );
  }, []);

  const renderSubmission = useCallback(({ item }: { item: Submission }) => (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View>
          <Text style={s.cardTitle}>{item.userName}</Text>
          <Text style={s.subText}>{item.campaignTitle}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: item.status === 'pending' ? '#FEF3C7' : '#D1FAE5' }]}>
          <Text style={[s.badgeText, { color: item.status === 'pending' ? '#D97706' : '#059669' }]}>{item.status}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => Linking.openURL(item.postUrl)}>
        <Text style={s.link} numberOfLines={1}>{item.postUrl}</Text>
      </TouchableOpacity>
      {item.status === 'pending' && (
        <View style={s.actionRow}>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#059669' }]} onPress={() => handleApprove(item._id)} disabled={processing === item._id}>
            {processing === item._id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.actionText}>Approve</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => handleReject(item._id)} disabled={processing === item._id}>
            <Text style={[s.actionText, { color: '#DC2626' }]}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ), [processing]);

  return (
    <View style={s.container}>
      <Text style={s.title}>Privé Campaigns</Text>
      <View style={s.tabRow}>
        {(['campaigns', 'submissions'] as TabType[]).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === 'campaigns' ? 'My Campaigns' : 'Submissions'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isLoading ? <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#7C3AED" /> : (
        <FlatList
          data={tab === 'campaigns' ? campaigns as any : submissions as any}
          keyExtractor={(i: any) => i._id}
          renderItem={tab === 'campaigns' ? renderCampaign as any : renderSubmission as any}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={fetchData} />}
          ListEmptyComponent={
            <View style={s.empty}><Ionicons name="megaphone-outline" size={48} color="#9CA3AF" />
              <Text style={s.emptyText}>{tab === 'campaigns' ? 'No campaigns yet' : 'No pending submissions'}</Text>
            </View>}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', paddingHorizontal: 16, paddingTop: 16 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 12, marginBottom: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6' },
  tabActive: { backgroundColor: '#7C3AED' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#FFF' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }, android: { elevation: 1 } }) },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  subText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  statsGrid: { flexDirection: 'row', gap: 8 },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 8, paddingVertical: 8 },
  statVal: { fontSize: 14, fontWeight: '700', color: '#111827' },
  statLbl: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  link: { fontSize: 13, color: '#7C3AED', marginBottom: 8 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 12 },
});
