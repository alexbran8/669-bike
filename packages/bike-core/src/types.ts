export type WheelPosition = 'front' | 'rear'
export type WheelSide = 'left' | 'right'
export type MeasurementStage = 'before' | 'after'
export type TensionUnit = 'kgf'
export interface Wheel { id: string; name: string | null; position: WheelPosition | null; spokeCount: number; rim: string | null; hub: string | null; targetLeft: number | null; targetRight: number | null; tensionUnit: TensionUnit; createdAt: string; updatedAt: string }
export interface TensionMeasurement { id?: string; spokeNumber: number; side: WheelSide; positionIndex: number; tension: number; stage: MeasurementStage }
export interface TensionSession { id: string; wheelId: string; notes: string | null; isNewWheel: boolean; createdAt: string; measurements: TensionMeasurement[] }
