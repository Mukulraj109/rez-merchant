/**
 * CustomerSegmentsCard Component
 * Customer segment breakdown visualization
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { CustomerSegmentData } from '@/types/analytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CustomerSegmentsCardProps {
  segments: CustomerSegmentData[];
  totalCustomers: number;
  isLoading?: boolean;
  onSegmentPress?: (segment: CustomerSegmentData) => void;
  onViewAll?: () => void;
}

const DEFAULT_SEGMENT_COLORS: Record<string, string> = {
  'high_value': Colors.light.success,
  'medium_value': Colors.light.info,
  'low_value': Colors.light.warning,
  'new': Colors.light.secondary,
  'at_risk': Colors.light.error,
  'dormant': Colors.light.textMuted,
  'active': Colors.light.primary,
};

export function CustomerSegmentsCard({
  segments,
  totalCustomers,
  isLoading = false,
  onSegmentPress,
  onViewAll,
}: CustomerSegmentsCardProps) {
  const formatSegmentName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getSegmentColor = (segment: CustomerSegmentData) => {
    return segment.color || DEFAULT_SEGMENT_COLORS[segment.segment.toLowerCase()] || Colors.light.textSecondary;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${value.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="people" size={20} color={Colors.light.info} />
            <ThemedText style={styles.title}>Customer Segments</ThemedText>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
      </View>
    );
  }

  if (!segments || segments.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="people" size={20} color={Colors.light.info} />
            <ThemedText style={styles.title}>Customer Segments</ThemedText>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={40} color={Colors.light.textMuted} />
          <ThemedText style={styles.emptyText}>No segment data</ThemedText>
        </View>
      </View>
    );
  }

  // Calculate max for bar scaling
  const maxCount = Math.max(...segments.map((s) => s.count));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="people" size={20} color={Colors.light.info} />
          <ThemedText style={styles.title}>Customer Segments</ThemedText>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
            <ThemedText style={styles.viewAllText}>View All</ThemedText>
            <Ionicons name="chevron-forward" size={14} color={Colors.light.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Total customers */}
      <View style={styles.totalContainer}>
        <ThemedText style={styles.totalValue}>{totalCustomers.toLocaleString()}</ThemedText>
        <ThemedText style={styles.totalLabel}>Total Customers</ThemedText>
      </View>

      {/* Segment distribution bar */}
      <View style={styles.distributionBar}>
        {segments.map((segment) => (
          <View
            key={segment.segment}
            style={[
              styles.distributionSegment,
              {
                flex: segment.percentage,
                backgroundColor: getSegmentColor(segment),
              },
            ]}
          />
        ))}
      </View>

      {/* Segments list */}
      <View style={styles.segmentsList}>
        {segments.map((segment) => {
          const color = getSegmentColor(segment);
          const barWidth = maxCount > 0 ? (segment.count / maxCount) * 100 : 0;

          return (
            <TouchableOpacity
              key={segment.segment}
              style={styles.segmentItem}
              onPress={() => onSegmentPress?.(segment)}
              disabled={!onSegmentPress}
              activeOpacity={0.7}
            >
              <View style={styles.segmentHeader}>
                <View style={styles.segmentLabelContainer}>
                  <View style={[styles.segmentDot, { backgroundColor: color }]} />
                  <ThemedText style={styles.segmentName}>
                    {formatSegmentName(segment.segment)}
                  </ThemedText>
                </View>
                <View style={styles.segmentStats}>
                  <ThemedText style={styles.segmentCount}>
                    {segment.count.toLocaleString()}
                  </ThemedText>
                  <ThemedText style={styles.segmentPercentage}>
                    {segment.percentage.toFixed(1)}%
                  </ThemedText>
                </View>
              </View>

              <View style={styles.segmentBarContainer}>
                <View
                  style={[
                    styles.segmentBar,
                    {
                      width: `${barWidth}%`,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>

              <View style={styles.segmentMetrics}>
                <View style={styles.segmentMetric}>
                  <ThemedText style={styles.metricLabel}>Revenue</ThemedText>
                  <ThemedText style={styles.metricValue}>
                    {formatCurrency(segment.revenue)}
                  </ThemedText>
                </View>
                <View style={styles.segmentMetric}>
                  <ThemedText style={styles.metricLabel}>Avg Order</ThemedText>
                  <ThemedText style={styles.metricValue}>
                    {formatCurrency(segment.avgOrderValue)}
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  totalContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.light.text,
  },
  totalLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  distributionBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  distributionSegment: {
    height: '100%',
  },
  segmentsList: {
    gap: 16,
  },
  segmentItem: {
    gap: 8,
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  segmentLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  segmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  segmentStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  segmentCount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  segmentPercentage: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  segmentBarContainer: {
    height: 6,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  segmentBar: {
    height: '100%',
    borderRadius: 3,
    opacity: 0.7,
  },
  segmentMetrics: {
    flexDirection: 'row',
    gap: 24,
    paddingLeft: 20,
  },
  segmentMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  loadingContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.light.textSecondary,
  },
  emptyContainer: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    color: Colors.light.textMuted,
    fontSize: 14,
  },
});

export default CustomerSegmentsCard;
