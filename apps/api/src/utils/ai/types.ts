/**
 * Call Transcript AI Agent Types
 * 
 * Defines input/output interfaces for the call transcript analysis agent
 * following modular monolith patterns for potential microservice extraction
 */

// Core analysis result structures
export interface CallAnalysis {
  id: string
  transcriptId: string
  userId: string
  callType: CallTypeAnalysis
  staffPerformance?: StaffPerformanceAnalysis // Optional for voicemails
  customerSentiment?: CustomerSentimentAnalysis // Optional for voicemails
  salesProgress?: SalesProgressAnalysis
  serviceResolution?: ServiceResolutionAnalysis
  overallAnalysis: OverallAnalysis
  metadata: AnalysisMetadata
  createdAt: string
  updatedAt: string
}

export interface CallTypeAnalysis {
  classification: 'sales' | 'customer_service' | 'unknown'
  confidence: number
  indicators: string[]
  reasoning: string
}

export interface StaffPerformanceAnalysis {
  knowledge: {
    score: number // 1-10
    confidence: number
    reasoning: string // Why this score? Brief explanation
    evidence: string[]
    improvements: string[]
  }
  authority: {
    score: number // 1-10
    confidence: number
    reasoning: string // Why this score? Brief explanation
    evidence: string[]
    improvements: string[]
  }
  clarity: {
    score: number // 1-10
    confidence: number
    reasoning: string // Why this score? Brief explanation
    questionsAnswered: number
    questionsTotal: number
    evidence: string[]
    improvements: string[]
  }
  overall: {
    score: number // 1-10
    reasoning: string // Why this overall score? Brief explanation
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
  }
}

export interface CustomerSentimentAnalysis {
  initial: SentimentScore
  final: SentimentScore
  journey: SentimentJourneyPoint[]
  overall: {
    trend: 'positive' | 'negative' | 'neutral' | 'mixed'
    satisfaction: number // 1-10
    confidence: number
    keyMoments: KeyMoment[]
  }
}

export interface SentimentScore {
  score: number // -1 to 1 (negative to positive)
  label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
  confidence: number
  reasoning: string // Why this sentiment? Brief explanation
  evidence: string[]
}

export interface SentimentJourneyPoint {
  timestamp: number // seconds from start
  sentiment: SentimentScore
  trigger?: string
}

export interface KeyMoment {
  timestamp: number
  type: 'frustration' | 'satisfaction' | 'confusion' | 'resolution' | 'escalation'
  description: string
  impact: 'high' | 'medium' | 'low'
}

export interface SalesProgressAnalysis {
  stage: 'initial_contact' | 'needs_assessment' | 'presentation' | 'objection_handling' | 'closing' | 'follow_up' | 'discovery'
  progression: 'advanced' | 'maintained' | 'regressed' | 'stalled'
  confidence: number
  indicators: {
    positive: string[]
    negative: string[]
    neutral: string[]
  }
  nextSteps: string[]
  likelihood: number // 0-100% chance of conversion
  customerNeed?: string // Customer's main need/want/problem from their perspective
  reasoning?: string // How the main need was identified
}

export interface ServiceResolutionAnalysis {
  issueIdentified: boolean
  issueType: string
  resolutionStatus: 'resolved' | 'partially_resolved' | 'unresolved' | 'escalated'
  confidence: number
  resolutionSteps: string[]
  followUpNeeded: boolean
  customerSatisfaction: number // 1-10
  reasoning: string
}

export interface OverallAnalysis {
  callQuality: number // 1-10
  callQualityReasoning: string // Why this call quality score? Brief explanation
  successMetrics: {
    goalAchieved: boolean
    customerSatisfied: boolean
    professionalHandling: boolean
    followUpScheduled: boolean
  }
  keyInsights: string[]
  actionItems: string[]
  callDuration: number // seconds
  talkTimeRatio: number // staff talk time / total time
}

export interface AnalysisMetadata {
  modelUsed: string
  modelVersion: string
  processingTime: number // milliseconds
  confidence: number // overall analysis confidence
  flags: AnalysisFlag[]
  failedComponents?: string[] // List of analysis components that failed AI processing
}

export interface AnalysisFlag {
  type: 'low_confidence' | 'audio_quality' | 'multiple_speakers' | 'background_noise' | 'incomplete_transcript' | 'ai_failure' | 'non_conversation' | 'insufficient_content'
  severity: 'low' | 'medium' | 'high'
  description: string
}

// Module Input Interface
export interface CallTranscriptAgentInput {
  // Operation type
  operation: 'transcribe-and-analyze' | 'analyze' | 'get-analysis' | 'get-insights' | 'get-status' | 'reanalyze'
  
  // Transcription data (for transcribe-and-analyze operation)
  transcriptionData?: {
    transcriptId: string
    audioFileUrl: string
    userId: string
    callMetadata?: {
      duration?: number
      participants?: string[]
      timestamp?: string
      callId?: string
    }
  }
  
  // Analysis data (for analyze-only operation)
  analysisData?: {
    transcriptId: string
    transcriptText: string
    userId: string
    callMetadata?: {
      duration?: number
      participants?: string[]
      timestamp?: string
      callId?: string
    }
  }
  
  // Query parameters
  queryParams?: {
    analysisId?: string
    transcriptId?: string
    userId?: string
    limit?: number
    offset?: number
    dateFrom?: string
    dateTo?: string
    callType?: 'sales' | 'customer_service'
  }
  
  // Configuration options
  options?: {
    // Transcription settings
    transcriptionService?: 'anthropic' | 'openai' // default: anthropic (Claude-powered), legacy: openai
    includeSegments?: boolean // default: false
    deleteAudioAfterProcessing?: boolean // default: true
    
    // Analysis settings
    aiModel?: 'claude' | 'gpt4' | 'gpt4-turbo' // default: claude
    analysisDepth?: 'basic' | 'standard' | 'comprehensive' // default: standard
    includeRecommendations?: boolean // default: true
    generateInsights?: boolean // default: true
    confidenceThreshold?: number // default: 0.7
    enableCaching?: boolean // default: true
    customPrompts?: {
      callType?: string
      staffPerformance?: string
      sentiment?: string
    }
  }
}

// Module Output Interface
export interface CallTranscriptAgentOutput {
  success: boolean
  operation: CallTranscriptAgentInput['operation']
  timestamp: string
  
  // Transcription results (for transcribe-and-analyze operation)
  transcription?: {
    transcriptId: string
    text: string
    confidence: number
    duration: number
    segments?: any[]
    language?: string
    processingTime: number
  }
  
  // Analysis results
  analysis?: CallAnalysis
  analyses?: CallAnalysis[]
  
  // Insights and aggregations
  insights?: {
    userId: string
    dateRange: { from: string, to: string }
    callTypeDistribution: { sales: number, customer_service: number, unknown: number }
    averageScores: {
      staffKnowledge: number
      staffAuthority: number
      staffClarity: number
      customerSatisfaction: number
      callQuality: number
    }
    trends: {
      sentimentTrend: 'improving' | 'declining' | 'stable'
      performanceTrend: 'improving' | 'declining' | 'stable'
      resolutionRate: number
      conversionRate: number
    }
    topIssues: string[]
    recommendations: string[]
  }
  
  // Status information
  status?: {
    totalAnalyses: number
    analysisQueue: number
    averageProcessingTime: number // seconds
    modelHealth: {
      claude: boolean
      gpt4: boolean
    }
    isHealthy: boolean
    performanceMetrics?: any
    resourceUsage?: any
    circuitBreakers?: any
    rateLimiters?: any
    apiKeys?: {
      openai: boolean
      anthropic: boolean
      supabase: boolean
    }
  }
  
  // Error information
  error?: {
    code: string
    message: string
    details?: any
  }
}

// Internal helper types
export interface AnalysisResult {
  analysisId: string
  success: boolean
  processingTime: number
  error?: string
}

export interface DatabaseAnalysis {
  id: string
  transcript_id: string
  user_id: string
  call_type_classification: string
  call_type_confidence: number
  call_type_reasoning: string
  staff_knowledge_score: number
  staff_authority_score: number
  staff_clarity_score: number
  staff_overall_score: number
  customer_initial_sentiment: number
  customer_final_sentiment: number
  customer_satisfaction: number
  sales_progression: string | null
  sales_likelihood: number | null
  service_resolution_status: string | null
  service_follow_up_needed: boolean | null
  overall_call_quality: number
  overall_success_metrics: any // JSONB
  analysis_data: any // JSONB - full analysis object
  metadata: any // JSONB - analysis metadata
  created_at: string
  updated_at: string
}