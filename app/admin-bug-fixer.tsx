/**
 * Admin Dashboard - AI Bug Fixer
 * Review, approve, and manage AI-generated code fixes
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
import { cn } from '@/lib/utils';
import { getAIBugFixerService, BugReport } from '@/lib/ai-bug-fixer';

interface BugFixerState {
  reports: BugReport[];
  selectedReport: BugReport | null;
  showDetailModal: boolean;
  filterSeverity: 'all' | 'critical' | 'high' | 'medium' | 'low';
  filterStatus: 'all' | 'pending' | 'approved' | 'rejected' | 'applied';
}

export default function AdminBugFixerScreen() {
  const colors = useColors();
  const [state, setState] = useState<BugFixerState>({
    reports: [],
    selectedReport: null,
    showDetailModal: false,
    filterSeverity: 'all',
    filterStatus: 'all',
  });

  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    // Load bug reports from AI Bug Fixer service
    const bugFixer = getAIBugFixerService();
    const reports = bugFixer.getAllReports();
    setState((prev) => ({ ...prev, reports }));
  }, []);

  const filteredReports = state.reports.filter((report) => {
    const severityMatch = state.filterSeverity === 'all' || report.severity === state.filterSeverity;
    const statusMatch = state.filterStatus === 'all' || report.status === state.filterStatus;
    return severityMatch && statusMatch;
  });

  const handleApprove = (report: BugReport) => {
    // In production, this would call the AI Bug Fixer service to apply the fix
    const updatedReport = {
      ...report,
      status: 'approved' as const,
      approvedAt: new Date(),
      adminNotes,
    };

    setState((prev) => ({
      ...prev,
      reports: prev.reports.map((r) => (r.id === report.id ? updatedReport : r)),
      showDetailModal: false,
    }));

    setAdminNotes('');
  };

  const handleReject = (report: BugReport) => {
    const updatedReport = {
      ...report,
      status: 'rejected' as const,
      rejectedAt: new Date(),
      adminNotes,
    };

    setState((prev) => ({
      ...prev,
      reports: prev.reports.map((r) => (r.id === report.id ? updatedReport : r)),
      showDetailModal: false,
    }));

    setAdminNotes('');
  };

  const handleRollback = (report: BugReport) => {
    // In production, this would call the AI Bug Fixer service to rollback the fix
    const updatedReport = {
      ...report,
      status: 'pending' as const,
      appliedAt: undefined,
    };

    setState((prev) => ({
      ...prev,
      reports: prev.reports.map((r) => (r.id === report.id ? updatedReport : r)),
      showDetailModal: false,
    }));
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
      case 'pending':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'approved':
        return { bg: '#D1FAE5', text: '#065F46' };
      case 'rejected':
        return { bg: '#FEE2E2', text: '#7F1D1D' };
      case 'applied':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      default:
        return { bg: colors.surface, text: colors.foreground };
    }
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View className="px-4 py-6 border-b border-border">
          <Text className="text-3xl font-bold text-foreground mb-2">🤖 AI Bug Fixer</Text>
          <Text className="text-sm text-muted">
            Review and approve AI-generated code fixes
          </Text>
        </View>

        {/* Filters */}
        <View className="px-4 py-4 gap-3">
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

          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Filter by Status</Text>
            <View className="flex-row gap-2 flex-wrap">
              {(['all', 'pending', 'approved', 'rejected', 'applied'] as const).map((st) => (
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
        </View>

        {/* Bug Reports List */}
        <View className="px-4 py-2">
          <Text className="text-sm font-semibold text-muted mb-3">
            {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'}
          </Text>

          {filteredReports.length === 0 ? (
            <View className="bg-surface rounded-lg p-6 items-center gap-2">
              <Text className="text-lg font-semibold text-foreground">No reports found</Text>
              <Text className="text-sm text-muted text-center">
                All bugs are fixed! The AI scanner will check again soon.
              </Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={true}
              data={filteredReports}
              keyExtractor={(item) => item.id}
              renderItem={({ item: report }) => {
                const statusBadge = getStatusBadge(report.status);
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setState((prev) => ({
                        ...prev,
                        selectedReport: report,
                        showDetailModal: true,
                      }));
                      setAdminNotes('');
                    }}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 12,
                      borderLeftWidth: 4,
                      borderLeftColor: getSeverityColor(report.severity),
                    }}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-foreground">
                          {report.bugType}
                        </Text>
                        <Text className="text-xs text-muted mt-1">{report.filePath}</Text>
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
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-sm text-muted mb-2 line-clamp-2">
                      {report.description}
                    </Text>

                    <View className="flex-row gap-2 items-center">
                      <View
                        style={{
                          backgroundColor: getSeverityColor(report.severity),
                          opacity: 0.2,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: getSeverityColor(report.severity),
                            fontSize: 11,
                            fontWeight: '600',
                          }}
                        >
                          {report.severity.toUpperCase()}
                        </Text>
                      </View>
                      <Text className="text-xs text-muted">
                        {new Date(report.timestamp).toLocaleDateString()}
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
            {state.selectedReport && (
              <>
                {/* Modal Header */}
                <View className="px-4 py-4 border-b border-border flex-row justify-between items-center">
                  <Text className="text-2xl font-bold text-foreground">Fix Details</Text>
                  <TouchableOpacity
                    onPress={() => setState((prev) => ({ ...prev, showDetailModal: false }))}
                  >
                    <Text className="text-2xl text-muted">✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Report Details */}
                <View className="px-4 py-6 gap-6">
                  {/* Title & File */}
                  <View className="gap-2">
                    <Text className="text-lg font-bold text-foreground">
                      {state.selectedReport.bugType}
                    </Text>
                    <Text className="text-sm text-muted font-mono">
                      {state.selectedReport.filePath} (Line {state.selectedReport.lineNumber})
                    </Text>
                  </View>

                  {/* Severity & Status */}
                  <View className="flex-row gap-4">
                    <View
                      style={{
                        backgroundColor: getSeverityColor(state.selectedReport.severity),
                        opacity: 0.2,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: getSeverityColor(state.selectedReport.severity),
                          fontWeight: '600',
                        }}
                      >
                        {state.selectedReport.severity.toUpperCase()}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: getStatusBadge(state.selectedReport.status).bg,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: getStatusBadge(state.selectedReport.status).text,
                          fontWeight: '600',
                        }}
                      >
                        {state.selectedReport.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Description */}
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-foreground">Description</Text>
                    <Text className="text-sm text-muted leading-relaxed">
                      {state.selectedReport.description}
                    </Text>
                  </View>

                  {/* Current Code */}
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-foreground">Current Code</Text>
                    <View
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: 8,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text
                        className="text-xs font-mono text-muted"
                        numberOfLines={10}
                        ellipsizeMode="tail"
                      >
                        {state.selectedReport.codeSnippet}
                      </Text>
                    </View>
                  </View>

                  {/* Proposed Fix */}
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-foreground">Proposed Fix</Text>
                    <View
                      style={{
                        backgroundColor: '#D1FAE5',
                        borderRadius: 8,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: '#10B981',
                      }}
                    >
                      <Text
                        className="text-xs font-mono"
                        numberOfLines={10}
                        ellipsizeMode="tail"
                        style={{ color: '#065F46' }}
                      >
                        {state.selectedReport.proposedFix}
                      </Text>
                    </View>
                  </View>

                  {/* Explanation */}
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-foreground">Explanation</Text>
                    <Text className="text-sm text-muted leading-relaxed">
                      {state.selectedReport.fixExplanation}
                    </Text>
                  </View>

                  {/* Admin Notes */}
                  {state.selectedReport.status === 'pending' && (
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
                          minHeight: 100,
                          textAlignVertical: 'top',
                        }}
                        placeholder="Add notes about this fix..."
                        placeholderTextColor={colors.muted}
                        multiline
                        value={adminNotes}
                        onChangeText={setAdminNotes}
                      />
                    </View>
                  )}

                  {/* Action Buttons */}
                  {state.selectedReport.status === 'pending' && (
                    <View className="flex-row gap-3 mt-4">
                      <TouchableOpacity
                        onPress={() => handleApprove(state.selectedReport!)}
                        style={{
                          flex: 1,
                          backgroundColor: '#10B981',
                          paddingVertical: 12,
                          borderRadius: 8,
                          alignItems: 'center',
                        }}
                      >
                        <Text className="text-white font-semibold">✓ Approve & Apply</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleReject(state.selectedReport!)}
                        style={{
                          flex: 1,
                          backgroundColor: '#EF4444',
                          paddingVertical: 12,
                          borderRadius: 8,
                          alignItems: 'center',
                        }}
                      >
                        <Text className="text-white font-semibold">✕ Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {state.selectedReport.status === 'applied' && (
                    <TouchableOpacity
                      onPress={() => handleRollback(state.selectedReport!)}
                      style={{
                        backgroundColor: colors.surface,
                        paddingVertical: 12,
                        borderRadius: 8,
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: colors.border,
                      }}
                    >
                      <Text className="text-foreground font-semibold">↶ Rollback Fix</Text>
                    </TouchableOpacity>
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
