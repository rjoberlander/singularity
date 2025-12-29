/**
 * Sleep Correlation Service
 *
 * Analyzes correlations between sleep metrics and supplement protocols.
 * Provides insights on which supplements/protocols affect sleep quality.
 */

import { supabase } from '../../../config/supabase';

// =============================================
// TYPES
// =============================================

export interface SupplementSleepCorrelation {
  supplement_id: string;
  supplement_name: string;
  supplement_brand: string | null;
  nights_taken: number;
  nights_not_taken: number;

  // When taking supplement
  avg_sleep_score_with: number | null;
  avg_deep_sleep_pct_with: number | null;
  avg_rem_sleep_pct_with: number | null;
  avg_hrv_with: number | null;
  avg_time_slept_with: number | null;
  wake_2_4_am_rate_with: number;

  // When not taking supplement
  avg_sleep_score_without: number | null;
  avg_deep_sleep_pct_without: number | null;
  avg_rem_sleep_pct_without: number | null;
  avg_hrv_without: number | null;
  avg_time_slept_without: number | null;
  wake_2_4_am_rate_without: number;

  // Calculated differences
  sleep_score_diff: number | null;
  deep_sleep_diff: number | null;
  hrv_diff: number | null;
  wake_rate_diff: number;

  // Significance indicator
  impact: 'positive' | 'negative' | 'neutral';
  confidence: 'high' | 'medium' | 'low';
}

export interface TimingCorrelation {
  timing: string; // 'morning', 'afternoon', 'evening', 'before_bed'
  supplement_name: string;
  nights: number;
  avg_sleep_score: number | null;
  avg_deep_sleep_pct: number | null;
  wake_2_4_am_rate: number;
}

export interface DailyFactorCorrelation {
  factor: string;
  nights_with: number;
  nights_without: number;
  avg_score_with: number | null;
  avg_score_without: number | null;
  score_diff: number | null;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface CorrelationSummary {
  period_days: number;
  total_nights_analyzed: number;
  top_positive_supplements: SupplementSleepCorrelation[];
  top_negative_supplements: SupplementSleepCorrelation[];
  timing_insights: TimingCorrelation[];
  daily_factors: DailyFactorCorrelation[];
  recommendations: string[];
}

// =============================================
// SERVICE
// =============================================

export class SleepCorrelationService {
  /**
   * Build correlation data for a user
   * Links each sleep session to supplements taken that day
   */
  static async buildCorrelations(userId: string, days: number = 90): Promise<number> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString().split('T')[0];

    // Get all sleep sessions in range
    const { data: sessions, error: sessionsError } = await supabase
      .from('sleep_sessions')
      .select('id, date')
      .eq('user_id', userId)
      .gte('date', fromDateStr)
      .order('date', { ascending: false });

    if (sessionsError || !sessions) {
      console.error('Failed to fetch sleep sessions:', sessionsError);
      return 0;
    }

    // Get user's active supplements
    const { data: supplements, error: suppError } = await supabase
      .from('supplements')
      .select('id, name, brand, timing')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (suppError) {
      console.error('Failed to fetch supplements:', suppError);
    }

    let correlationsCreated = 0;

    for (const session of sessions) {
      // Check if correlation already exists
      const { data: existing } = await supabase
        .from('sleep_protocol_correlation')
        .select('id')
        .eq('sleep_session_id', session.id)
        .single();

      if (existing) {
        continue; // Skip if already exists
      }

      // Create supplement snapshot for this date
      // In a real app, you'd track actual intake; for now we assume active supplements are taken daily
      const supplementsTaken = supplements?.map((s) => ({
        id: s.id,
        name: s.name,
        brand: s.brand,
        timing: s.timing,
      })) || [];

      // Insert correlation record
      const { error: insertError } = await supabase
        .from('sleep_protocol_correlation')
        .insert({
          sleep_session_id: session.id,
          user_id: userId,
          date: session.date,
          supplements_taken: supplementsTaken,
          routine_items_completed: [],
          biomarkers_recorded: [],
        });

      if (!insertError) {
        correlationsCreated++;
      }
    }

    return correlationsCreated;
  }

  /**
   * Get supplement correlation analysis
   */
  static async getSupplementCorrelations(
    userId: string,
    days: number = 90
  ): Promise<SupplementSleepCorrelation[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString().split('T')[0];

    // Get all sleep sessions with correlations
    const { data: sessions, error } = await supabase
      .from('sleep_sessions')
      .select(`
        id,
        date,
        sleep_score,
        deep_sleep_pct,
        rem_sleep_pct,
        avg_hrv,
        time_slept,
        woke_between_2_and_4_am,
        sleep_protocol_correlation (
          supplements_taken
        )
      `)
      .eq('user_id', userId)
      .gte('date', fromDateStr)
      .not('sleep_protocol_correlation', 'is', null);

    if (error || !sessions) {
      console.error('Failed to fetch sessions for correlation:', error);
      return [];
    }

    // Get all user's supplements for comparison
    const { data: allSupplements } = await supabase
      .from('supplements')
      .select('id, name, brand')
      .eq('user_id', userId);

    if (!allSupplements || allSupplements.length === 0) {
      return [];
    }

    // Build correlation for each supplement
    const correlations: SupplementSleepCorrelation[] = [];

    for (const supp of allSupplements) {
      const nightsWith: typeof sessions = [];
      const nightsWithout: typeof sessions = [];

      for (const session of sessions) {
        const correlation = session.sleep_protocol_correlation?.[0];
        const supplementsTaken = (correlation?.supplements_taken as any[]) || [];

        const tookSupplement = supplementsTaken.some((s: any) => s.id === supp.id);

        if (tookSupplement) {
          nightsWith.push(session);
        } else {
          nightsWithout.push(session);
        }
      }

      // Need minimum data points for meaningful analysis
      if (nightsWith.length < 3 && nightsWithout.length < 3) {
        continue;
      }

      // Calculate averages for nights WITH supplement
      const withStats = calculateStats(nightsWith);
      const withoutStats = calculateStats(nightsWithout);

      // Calculate differences
      const sleepScoreDiff =
        withStats.avgSleepScore !== null && withoutStats.avgSleepScore !== null
          ? withStats.avgSleepScore - withoutStats.avgSleepScore
          : null;

      const deepSleepDiff =
        withStats.avgDeepSleep !== null && withoutStats.avgDeepSleep !== null
          ? withStats.avgDeepSleep - withoutStats.avgDeepSleep
          : null;

      const hrvDiff =
        withStats.avgHrv !== null && withoutStats.avgHrv !== null
          ? withStats.avgHrv - withoutStats.avgHrv
          : null;

      const wakeRateDiff = withStats.wake24Rate - withoutStats.wake24Rate;

      // Determine impact
      let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (sleepScoreDiff !== null) {
        if (sleepScoreDiff > 3) impact = 'positive';
        else if (sleepScoreDiff < -3) impact = 'negative';
      }

      // Determine confidence based on sample size
      const totalNights = nightsWith.length + nightsWithout.length;
      let confidence: 'high' | 'medium' | 'low' = 'low';
      if (totalNights >= 30 && nightsWith.length >= 10 && nightsWithout.length >= 10) {
        confidence = 'high';
      } else if (totalNights >= 14 && nightsWith.length >= 5 && nightsWithout.length >= 5) {
        confidence = 'medium';
      }

      correlations.push({
        supplement_id: supp.id,
        supplement_name: supp.name,
        supplement_brand: supp.brand,
        nights_taken: nightsWith.length,
        nights_not_taken: nightsWithout.length,

        avg_sleep_score_with: withStats.avgSleepScore,
        avg_deep_sleep_pct_with: withStats.avgDeepSleep,
        avg_rem_sleep_pct_with: withStats.avgRemSleep,
        avg_hrv_with: withStats.avgHrv,
        avg_time_slept_with: withStats.avgTimeSlept,
        wake_2_4_am_rate_with: withStats.wake24Rate,

        avg_sleep_score_without: withoutStats.avgSleepScore,
        avg_deep_sleep_pct_without: withoutStats.avgDeepSleep,
        avg_rem_sleep_pct_without: withoutStats.avgRemSleep,
        avg_hrv_without: withoutStats.avgHrv,
        avg_time_slept_without: withoutStats.avgTimeSlept,
        wake_2_4_am_rate_without: withoutStats.wake24Rate,

        sleep_score_diff: sleepScoreDiff,
        deep_sleep_diff: deepSleepDiff,
        hrv_diff: hrvDiff,
        wake_rate_diff: wakeRateDiff,

        impact,
        confidence,
      });
    }

    // Sort by sleep score difference (best first)
    correlations.sort((a, b) => {
      const aDiff = a.sleep_score_diff ?? 0;
      const bDiff = b.sleep_score_diff ?? 0;
      return bDiff - aDiff;
    });

    return correlations;
  }

  /**
   * Get daily factor correlations (alcohol, caffeine, exercise, stress)
   */
  static async getDailyFactorCorrelations(
    userId: string,
    days: number = 90
  ): Promise<DailyFactorCorrelation[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString().split('T')[0];

    const { data: sessions, error } = await supabase
      .from('sleep_sessions')
      .select(`
        sleep_score,
        sleep_protocol_correlation (
          alcohol_consumed,
          caffeine_after_noon,
          exercise_that_day,
          high_stress_day
        )
      `)
      .eq('user_id', userId)
      .gte('date', fromDateStr)
      .not('sleep_score', 'is', null);

    if (error || !sessions) {
      return [];
    }

    const factors = [
      { key: 'alcohol_consumed', label: 'Alcohol' },
      { key: 'caffeine_after_noon', label: 'Caffeine after noon' },
      { key: 'exercise_that_day', label: 'Exercise' },
      { key: 'high_stress_day', label: 'High stress' },
    ];

    const results: DailyFactorCorrelation[] = [];

    for (const factor of factors) {
      const withFactor: number[] = [];
      const withoutFactor: number[] = [];

      for (const session of sessions) {
        const correlation = session.sleep_protocol_correlation?.[0];
        if (!correlation || session.sleep_score === null) continue;

        const factorValue = (correlation as any)[factor.key];
        if (factorValue === true) {
          withFactor.push(session.sleep_score);
        } else if (factorValue === false) {
          withoutFactor.push(session.sleep_score);
        }
      }

      if (withFactor.length < 3 || withoutFactor.length < 3) {
        continue;
      }

      const avgWith = withFactor.reduce((a, b) => a + b, 0) / withFactor.length;
      const avgWithout = withoutFactor.reduce((a, b) => a + b, 0) / withoutFactor.length;
      const diff = avgWith - avgWithout;

      let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (diff > 3) impact = 'positive';
      else if (diff < -3) impact = 'negative';

      results.push({
        factor: factor.label,
        nights_with: withFactor.length,
        nights_without: withoutFactor.length,
        avg_score_with: Math.round(avgWith * 10) / 10,
        avg_score_without: Math.round(avgWithout * 10) / 10,
        score_diff: Math.round(diff * 10) / 10,
        impact,
      });
    }

    return results;
  }

  /**
   * Get full correlation summary with recommendations
   */
  static async getCorrelationSummary(
    userId: string,
    days: number = 90
  ): Promise<CorrelationSummary> {
    // Build correlations first if needed
    await this.buildCorrelations(userId, days);

    // Get supplement correlations
    const supplementCorrelations = await this.getSupplementCorrelations(userId, days);

    // Get daily factor correlations
    const dailyFactors = await this.getDailyFactorCorrelations(userId, days);

    // Separate positive and negative impacts
    const positiveSupplements = supplementCorrelations
      .filter((c) => c.impact === 'positive')
      .slice(0, 5);

    const negativeSupplements = supplementCorrelations
      .filter((c) => c.impact === 'negative')
      .slice(0, 5);

    // Count total nights analyzed
    const { count } = await supabase
      .from('sleep_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Generate recommendations
    const recommendations: string[] = [];

    // Supplement recommendations
    for (const supp of positiveSupplements.slice(0, 2)) {
      if (supp.confidence === 'high' && supp.sleep_score_diff && supp.sleep_score_diff > 5) {
        recommendations.push(
          `${supp.supplement_name} appears to improve your sleep score by ${supp.sleep_score_diff.toFixed(0)} points. Consider keeping it in your protocol.`
        );
      }
    }

    for (const supp of negativeSupplements.slice(0, 2)) {
      if (supp.confidence !== 'low' && supp.sleep_score_diff && supp.sleep_score_diff < -5) {
        recommendations.push(
          `${supp.supplement_name} may be negatively affecting your sleep (${supp.sleep_score_diff.toFixed(0)} point difference). Consider adjusting timing or dosage.`
        );
      }
    }

    // Daily factor recommendations
    for (const factor of dailyFactors) {
      if (factor.impact === 'negative' && factor.score_diff && factor.score_diff < -5) {
        recommendations.push(
          `${factor.factor} appears to reduce your sleep score by ${Math.abs(factor.score_diff).toFixed(0)} points.`
        );
      }
      if (factor.impact === 'positive' && factor.score_diff && factor.score_diff > 5) {
        recommendations.push(
          `${factor.factor} on days you sleep appears to improve your score by ${factor.score_diff.toFixed(0)} points.`
        );
      }
    }

    // 2-4am wake recommendations
    const highWakeRateSupps = supplementCorrelations.filter(
      (c) => c.wake_rate_diff > 15 && c.confidence !== 'low'
    );
    for (const supp of highWakeRateSupps.slice(0, 1)) {
      recommendations.push(
        `${supp.supplement_name} is associated with ${supp.wake_rate_diff.toFixed(0)}% more 2-4am waking. This may indicate blood sugar or cortisol effects.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Not enough data yet for personalized recommendations. Keep tracking for more insights!'
      );
    }

    return {
      period_days: days,
      total_nights_analyzed: count || 0,
      top_positive_supplements: positiveSupplements,
      top_negative_supplements: negativeSupplements,
      timing_insights: [], // TODO: Implement timing analysis
      daily_factors: dailyFactors,
      recommendations,
    };
  }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

interface SessionStats {
  avgSleepScore: number | null;
  avgDeepSleep: number | null;
  avgRemSleep: number | null;
  avgHrv: number | null;
  avgTimeSlept: number | null;
  wake24Rate: number;
}

function calculateStats(sessions: any[]): SessionStats {
  if (sessions.length === 0) {
    return {
      avgSleepScore: null,
      avgDeepSleep: null,
      avgRemSleep: null,
      avgHrv: null,
      avgTimeSlept: null,
      wake24Rate: 0,
    };
  }

  const sleepScores = sessions
    .map((s) => s.sleep_score)
    .filter((v) => v !== null) as number[];

  const deepSleeps = sessions
    .map((s) => s.deep_sleep_pct)
    .filter((v) => v !== null) as number[];

  const remSleeps = sessions
    .map((s) => s.rem_sleep_pct)
    .filter((v) => v !== null) as number[];

  const hrvs = sessions
    .map((s) => s.avg_hrv)
    .filter((v) => v !== null) as number[];

  const timesSlept = sessions
    .map((s) => s.time_slept)
    .filter((v) => v !== null) as number[];

  const wake24Count = sessions.filter((s) => s.woke_between_2_and_4_am).length;

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

  return {
    avgSleepScore: avg(sleepScores),
    avgDeepSleep: avg(deepSleeps),
    avgRemSleep: avg(remSleeps),
    avgHrv: avg(hrvs),
    avgTimeSlept: avg(timesSlept),
    wake24Rate: Math.round((wake24Count / sessions.length) * 100),
  };
}

export default SleepCorrelationService;
