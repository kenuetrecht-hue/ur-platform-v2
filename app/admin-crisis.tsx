/**
 * Admin Dashboard - Crisis Incidents
 * Review and manage crisis incidents detected by the safety system
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { getCrisisService, CrisisDetectionResult } from '@/lib/crisis-service';

// Crisis Incident type for admin dashboard
interface CrisisIncident extends CrisisDetectionResult {
  id: string;
  status: 'new' | 'acknowledged' | 'resolved';
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  followUpAction?: string;
  adminNotes?: string;
  resourcesProvided?: string;
  detectedAt: Date;
  context: string; // Full message context
}

interface CrisisState {
  incidents: CrisisIncident[];
  selectedIncident: CrisisIncident | null;
  showDetailModal: boolean;
  filterStatus: 'all' | 'new' | 'acknowledged' | 'resolved';
  filterSeverity: 'all' | 'low' | 'medium' | 'high' | 'critical';
}

export default function AdminCrisisScreen() {
  const colors = useColors();
  const [state, setState] = useState<CrisisState>({
    incidents: [],
    selectedIncident: null,
    showDetailModal: false,
    filterStatus: 'all',
    filterSeverity: 'all',
  });

  const [adminNotes, setAdminNotes] = useState('');
  const [followUpAction, setFollowUpAction] = useState('');

  useEffect(() => {
    // Load crisis incidents from service
    const crisisService = getCrisisService();
    // In production, this would retrieve stored incidents from database
    // For now, we'll show an empty list as a placeholder
    const incidents: CrisisIncident[] = [];
    setState((prev) => ({ ...prev, incidents }));
  }, []);

  const filteredIncidents = state.incidents.filter((incident) => {
    const statusMatch = state.filterStatus === 'all' || incident.status === state.filterStatus;
    const severityMatch = state.filterSeverity === 'all' || incident.severity === state.filterSeverity;
    return statusMatch && severityMatch;
  });

  const handleAcknowledge = (incident: CrisisIncident) => {
    const updatedIncident = {
      ...incident,
      status: 'acknowledged' as const,
      acknowledgedAt: new Date(),
      acknowledgedBy: 'admin',
      adminNotes,
    };

    setState((prev) => ({
      ...prev,
      incidents: prev.incidents.map((i) => (i.id === incident.id ? updatedIncident : i)),
      showDetailModal: false,
    }));

    setAdminNotes('');
  };

  const handleResolve = (incident: CrisisIncident) => {
    const updatedIncident = {
      ...incident,
      status: 'resolved' as const,
      resolvedAt: new Date(),
      followUpAction,
      adminNotes,
    };

    setState((prev) => ({
      ...prev,
      incidents: prev.incidents.map((i) => (i.id === incident.id ? updatedIncident : i)),
      showDetailModal: false,
    }));

    setAdminNotes('');
    setFollowUpAction('');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return '#3B82F6';
      case 'low':
        return '#10B981';
      default:
        return colors.muted;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'acknowledged':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'resolved':
        return { bg: '#D1FAE5', text: '#065F46' };
      default:
        return { bg: colors.surface, text: colors.foreground };
    }
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View className="px-4 py-6 border-b border-border">
          <Text className="text-3xl font-bold text-foreground mb-2">🚨 Crisis Incidents</Text>
          <Text className="text-sm text-muted">
            Review and manage safety incidents
          </Text>
        </View>

        {/* Filters */}
        <View className="px-4 py-4 gap-3">
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Filter by Status</Text>
            <View className="flex-row gap-2 flex-wrap">
              {(['all', 'new', 'acknowledged', 'resolved'] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setState((prev) => ({ ...prev, filterStatus: st }))}
                  style={{
                    backgroundColor:
                      state.filterStatus === st ? colors.primary : colors.surface,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: state.filterStatus === st ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: state.filterStatus === st ? '#fff' : colors.foreground,
                      fontSize: 12,
                      fontWeight: '500',
                    }}
                  >
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Filter by Severity</Text>
            <View className="flex-row gap-2 flex-wrap">
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map((sev) => (
                <TouchableOpacity
                  key={sev}
                  onPress={() => setState((prev) => ({ ...prev, filterSeverity: sev }))}
                  style={{
                    backgroundColor:
                      state.filterSeverity === sev ? colors.primary : colors.surface,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: state.filterSeverity === sev ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: state.filterSeverity === sev ? '#fff' : colors.foreground,
                      fontSize: 12,
                      fontWeight: '500',
                    }}
                  >
                    {sev.charAt(0).toUpperCase() + sev.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Incidents List */}
        <View className="px-4 py-2">
          <Text className="text-sm font-semibold text-muted mb-3">
            {filteredIncidents.length} {filteredIncidents.length === 1 ? 'incident' : 'incidents'}
          </Text>

          {filteredIncidents.length === 0 ? (
            <View className="bg-surface rounded-lg p-6 items-center gap-2">
              <Text className="text-lg font-semibold text-foreground">No incidents found</Text>
              <Text className="text-sm text-muted text-center">
                All users are safe. Keep monitoring.
              </Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={true}
              data={filteredIncidents}
              keyExtractor={(item) => item.id}
              renderItem={({ item: incident }) => {
                const statusBadge = getStatusBadge(incident.status);
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setState((prev) => ({
                        ...prev,
                        selectedIncident: incident,
                        showDetailModal: true,
                      }));
                      setAdminNotes('');
                      setFollowUpAction('');
                    }}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 12,
                      borderLeftWidth: 4,
                      borderLeftColor: getSeverityColor(incident.severity),
                    }}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-foreground">
                          {incident.userId}
                        </Text>
                        <Text className="text-xs text-muted mt-1">
                          {incident.keywords.join(', ')}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: statusBadge.bg,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: statusBadge.text, fontSize: 11, fontWeight: '600' }}>
                          {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-sm text-muted mb-2 line-clamp-2">
                      {incident.message}
                    </Text>

                    <View className="flex-row gap-2 items-center">
                      <View
                        style={{
                          backgroundColor: getSeverityColor(incident.severity),
                          opacity: 0.2,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: getSeverityColor(incident.severity),
                            fontSize: 11,
                            fontWeight: '600',
                          }}
                        >
                          {incident.severity.toUpperCase()}
                        </Text>
                      </View>
                      <Text className="text-xs text-muted">
                        {new Date(incident.detectedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={state.showDetailModal}
        animationType="slide"
        onRequestClose={() => setState((prev) => ({ ...prev, showDetailModal: false }))}
      >
        <ScreenContainer className="flex-1 bg-background">
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            {state.selectedIncident && (
              <>
                {/* Modal Header */}
                <View className="px-4 py-4 border-b border-border flex-row justify-between items-center">
                  <Text className="text-2xl font-bold text-foreground">Incident Details</Text>
                  <TouchableOpacity
                    onPress={() => setState((prev) => ({ ...prev, showDetailModal: false }))}
                  >
                    <Text className="text-2xl text-muted">✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Incident Details */}
                <View className="px-4 py-6 gap-6">
                  {/* User & Time */}
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-muted">User ID</Text>
                    <Text className="text-lg font-bold text-foreground">
                      {state.selectedIncident.userId}
                    </Text>
                    <Text className="text-xs text-muted mt-2">
                      Detected: {new Date(state.selectedIncident.detectedAt).toLocaleString()}
                    </Text>
                  </View>

                  {/* Severity & Status */}
                  <View className="flex-row gap-4">
                    <View
                      style={{
                        backgroundColor: getSeverityColor(state.selectedIncident.severity),
                        opacity: 0.2,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: getSeverityColor(state.selectedIncident.severity),
                          fontWeight: '600',
                        }}
                      >
                        {state.selectedIncident.severity.toUpperCase()}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: getStatusBadge(state.selectedIncident.status).bg,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: getStatusBadge(state.selectedIncident.status).text,
                          fontWeight: '600',
                        }}
                      >
                        {state.selectedIncident.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Keywords */}
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-foreground">Detected Keywords</Text>
                    <View className="flex-row gap-2 flex-wrap">
                      {state.selectedIncident.keywords.map((keyword: string, idx: number) => (
                        <View
                          key={idx}
                          style={{
                            backgroundColor: '#FEE2E2',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ color: '#7F1D1D', fontSize: 12, fontWeight: '500' }}>
                            {keyword}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Context */}
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-foreground">Context</Text>
                    <View
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: 8,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text className="text-sm text-muted leading-relaxed">
                        {state.selectedIncident.message}
                      </Text>
                    </View>
                  </View>

                  {/* Resources Provided */}
                  {state.selectedIncident.resourcesProvided && (
                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">Resources Provided</Text>
                      <View
                        style={{
                          backgroundColor: '#D1FAE5',
                          borderRadius: 8,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: '#10B981',
                        }}
                      >
                        <Text style={{ color: '#065F46', fontSize: 12, lineHeight: 18 }}>
                          {state.selectedIncident.resourcesProvided}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Admin Notes */}
                  {state.selectedIncident.status !== 'resolved' && (
                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">Admin Notes</Text>
                      <TextInput
                        style={{
                          backgroundColor: colors.surface,
                          borderRadius: 8,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: colors.border,
                          color: colors.foreground,
                          minHeight: 80,
                          textAlignVertical: 'top',
                        }}
                        placeholder="Add notes about this incident..."
                        placeholderTextColor={colors.muted}
                        multiline
                        value={adminNotes}
                        onChangeText={setAdminNotes}
                      />
                    </View>
                  )}

                  {/* Follow-up Action */}
                  {state.selectedIncident.status === 'acknowledged' && (
                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">Follow-up Action</Text>
                      <TextInput
                        style={{
                          backgroundColor: colors.surface,
                          borderRadius: 8,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: colors.border,
                          color: colors.foreground,
                          minHeight: 80,
                          textAlignVertical: 'top',
                        }}
                        placeholder="Describe follow-up action taken..."
                        placeholderTextColor={colors.muted}
                        multiline
                        value={followUpAction}
                        onChangeText={setFollowUpAction}
                      />
                    </View>
                  )}

                  {/* Action Buttons */}
                  {state.selectedIncident.status === 'new' && (
                    <TouchableOpacity
                      onPress={() => handleAcknowledge(state.selectedIncident!)}
                      style={{
                        backgroundColor: '#3B82F6',
                        paddingVertical: 12,
                        borderRadius: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Text className="text-white font-semibold">✓ Acknowledge</Text>
                    </TouchableOpacity>
                  )}

                  {state.selectedIncident.status === 'acknowledged' && (
                    <TouchableOpacity
                      onPress={() => handleResolve(state.selectedIncident!)}
                      style={{
                        backgroundColor: '#10B981',
                        paddingVertical: 12,
                        borderRadius: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Text className="text-white font-semibold">✓ Mark Resolved</Text>
                    </TouchableOpacity>
                  )}

                  {state.selectedIncident.status === 'resolved' && (
                    <View
                      style={{
                        backgroundColor: '#D1FAE5',
                        borderRadius: 8,
                        padding: 16,
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#065F46' }}>
                        ✓ Resolved
                      </Text>
                      <Text style={{ fontSize: 14, color: '#047857', textAlign: 'center' }}>
                        This incident has been handled. Follow-up: {state.selectedIncident.followUpAction}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}
