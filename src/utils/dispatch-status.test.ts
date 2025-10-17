import { describe, it, expect } from 'vitest';
import { getUnitStatusFromCallNotes } from './dispatch-status';

describe('getUnitStatusFromCallNotes', () => {
  describe('Clear/Available status', () => {
    it('should detect COMPLETE status', () => {
      const callNotes = '12:34:56: E1, UNIT COMPLETE';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('clear');
      expect(result?.label).toBe('Cleared');
    });

    it('should detect AVAILABLE status', () => {
      const callNotes = '12:34:56: E1, UNIT AVAILABLE';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('clear');
      expect(result?.label).toBe('Cleared');
    });

    it('should prioritize COMPLETE/AVAILABLE over location-based status', () => {
      const callNotes = '12:34:56: E1, AVAILABLE ON SCENE';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('clear');
      expect(result?.label).toBe('Cleared');
    });
  });

  describe('Transport status', () => {
    it('should detect TRANSPORTING INDIVIDUAL', () => {
      const callNotes = '12:34:56: E1, TRANSPORTING INDIVIDUAL';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('transporting');
      expect(result?.label).toBe('Transport');
    });

    it('should detect general TRANSPORTING', () => {
      const callNotes = '12:34:56: E1, TRANSPORTING TO HOSPITAL';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('transporting');
      expect(result?.label).toBe('Transport');
    });
  });

  describe('Transport Arrived status', () => {
    it('should detect ARRIVED AT HOSPITAL', () => {
      const callNotes = '12:34:56: E1, ARRIVED AT HOSPITAL';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('transport_arrived');
      expect(result?.label).toBe('Transport Arrived');
    });

    it('should detect ARRIVED AT LZ', () => {
      const callNotes = '12:34:56: E1, ARRIVED AT LZ';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('transport_arrived');
      expect(result?.label).toBe('Transport Arrived');
    });

    it('should detect arrived at hospital in mixed case', () => {
      const callNotes = '12:34:56: E1, Arrived at County Hospital';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('transport_arrived');
      expect(result?.label).toBe('Transport Arrived');
    });
  });

  describe('On Scene status', () => {
    it('should detect UNIT ON LOCATION', () => {
      const callNotes = '12:34:56: E1, UNIT ON LOCATION';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('on_scene');
      expect(result?.label).toBe('On Scene');
    });

    it('should detect ON SCENE', () => {
      const callNotes = '12:34:56: E1, ON SCENE';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('on_scene');
      expect(result?.label).toBe('On Scene');
    });

    it('should detect UNIT DISPATCHED & ARRIVED ON SCENE', () => {
      const callNotes = '12:34:56: E1, UNIT DISPATCHED & ARRIVED ON SCENE';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('on_scene');
      expect(result?.label).toBe('On Scene');
    });

    it('should detect ARRIVED AT (non-hospital location)', () => {
      const callNotes = '12:34:56: E1, ARRIVED AT SCENE';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('on_scene');
      expect(result?.label).toBe('On Scene');
    });
  });

  describe('Enroute status', () => {
    it('should detect ENROUTE', () => {
      const callNotes = '12:34:56: E1, ENROUTE';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('enroute');
      expect(result?.label).toBe('Enroute');
    });
  });

  describe('Dispatched status', () => {
    it('should detect UNIT DISPATCHED', () => {
      const callNotes = '12:34:56: E1, UNIT DISPATCHED';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('dispatched');
      expect(result?.label).toBe('Dispatched');
    });

    it('should detect DISPATCHED', () => {
      const callNotes = '12:34:56: E1, DISPATCHED';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('dispatched');
      expect(result?.label).toBe('Dispatched');
    });

    it('should default to Dispatched for unrecognized status', () => {
      const callNotes = '12:34:56: E1, SOME UNKNOWN STATUS';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('dispatched');
      expect(result?.label).toBe('Dispatched');
    });
  });

  describe('Status precedence and ordering', () => {
    it('should use most recent status (first line)', () => {
      const callNotes = `12:35:00: E1, ON SCENE
12:34:00: E1, ENROUTE
12:33:00: E1, DISPATCHED`;
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('on_scene');
    });

    it('should skip non-matching units', () => {
      const callNotes = `12:35:00: E2, ON SCENE
12:34:00: E1, ENROUTE
12:33:00: E2, DISPATCHED`;
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('enroute');
    });

    it('should handle case-insensitive unit matching', () => {
      const callNotes = '12:34:56: e1, ENROUTE';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('enroute');
    });
  });

  describe('Border class for our units', () => {
    it('should use blue border for our units', () => {
      const callNotes = '12:34:56: E1, ENROUTE';
      const result = getUnitStatusFromCallNotes('E1', callNotes, true);
      expect(result?.borderClass).toContain('border-blue-500');
    });

    it('should use status-specific border for other units', () => {
      const callNotes = '12:34:56: E1, ENROUTE';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.borderClass).toContain('border-green');
    });
  });

  describe('Edge cases', () => {
    it('should return null for empty call notes', () => {
      const result = getUnitStatusFromCallNotes('E1', '', false);
      expect(result).toBeNull();
    });

    it('should return null for null call notes', () => {
      const result = getUnitStatusFromCallNotes('E1', null, false);
      expect(result).toBeNull();
    });

    it('should return null when unit not found', () => {
      const callNotes = '12:34:56: E2, ENROUTE';
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result).toBeNull();
    });

    it('should handle malformed lines gracefully', () => {
      const callNotes = `This is not a valid line
12:34:56: E1, ENROUTE
Another bad line`;
      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('enroute');
    });
  });

  describe('Real-world dispatch scenarios', () => {
    it('should handle full dispatch progression', () => {
      const callNotes = `12:40:00: E1, UNIT COMPLETE
12:38:00: E1, ARRIVED AT HOSPITAL
12:35:00: E1, TRANSPORTING INDIVIDUAL
12:33:00: E1, ON SCENE
12:31:00: E1, ENROUTE
12:30:00: E1, UNIT DISPATCHED`;

      const result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(result?.status).toBe('clear');
      expect(result?.label).toBe('Cleared');
    });

    it('should handle multi-unit dispatch', () => {
      const callNotes = `12:35:00: E1, ON SCENE
12:34:30: M1, ENROUTE
12:34:00: E1, ENROUTE
12:33:00: M1, DISPATCHED
12:32:00: E1, DISPATCHED`;

      const e1Result = getUnitStatusFromCallNotes('E1', callNotes, false);
      expect(e1Result?.status).toBe('on_scene');

      const m1Result = getUnitStatusFromCallNotes('M1', callNotes, false);
      expect(m1Result?.status).toBe('enroute');
    });

    it('should correctly parse MA40 as arrived on scene, not just dispatched or enroute', () => {
      const callNotes = `16:28:11: K10, UNIT ON LOCATION
16:27:04: RADIO TRAFFIC WAS MOVED TO 12C AT 1610
16:21:48: E02, Message - FIRES OUT E02 WILL BE MOPPING UP
16:21:15: P10, UNIT ON LOCATION
16:18:16: E02, Message - SHOW ME W CMD GOT WATER ON THE FIRE AND HOT SPOTS
16:17:07: K02, UNIT ON LOCATION
16:13:29: K10, UNIT DISPATCHED & ENROUTE
16:13:22: B02, UNIT ON LOCATION
16:13:17: E02, UNIT ON LOCATION - ONE COMBIE FULLY ENGULFED
16:05:35: K02, UNIT DISPATCHED & ENROUTE
16:03:55: UNITS EXCHANGED
16:01:45: B02, UNIT DISPATCHED & ENROUTE
16:01:15: FS10, UNIT DISPATCHED
16:00:02: MA40, Message - FULLY ENGULFED MOVING TO A BEAN FIELD SLOWING
15:58:43: E02, UNIT ENROUTE
15:58:22: UNITS EXCHANGED
15:57:11: MA40, UNIT DISPATCHED & ARRIVED ON SCENE
15:55:13: CALLER WAS ADV I WAS GETTING INFORMATION FOR THE FIRE DEPT. CALLER THEN STATED ITS GOING TO BE GONE BEFORE THEY GET THERE
15:54:30: CALLER NOT GIVING INFORMATION JUST KEEPS REPEATING THAT IM WASTING TIME
15:53:04: OUT IN A FIELD
15:52:06: BRAVO ADVISED
15:51:32: FS02, Assign
15:50:28: DIESEL POWERED
15:49:51: COMBINE ON FIRE`;

      // MA40 should be "on_scene" because of "UNIT DISPATCHED & ARRIVED ON SCENE"
      const ma40Result = getUnitStatusFromCallNotes('MA40', callNotes, false);
      expect(ma40Result?.status).toBe('on_scene');
      expect(ma40Result?.label).toBe('On Scene');

      // E02 should be "on_scene" because of "UNIT ON LOCATION" (most recent status)
      const e02Result = getUnitStatusFromCallNotes('E02', callNotes, false);
      expect(e02Result?.status).toBe('on_scene');
      expect(e02Result?.label).toBe('On Scene');
    });
  });
});
