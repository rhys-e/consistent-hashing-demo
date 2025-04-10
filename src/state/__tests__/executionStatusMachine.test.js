import { createActor } from 'xstate';
import { executionStatusMachine } from '../executionStatusMachine';
import { useExecutionStatus } from '../../hooks/useExecutionStatus';
import { renderHook, act } from '@testing-library/react';

describe('Execution Status Machine', () => {
  describe('Machine Direct Tests', () => {
    let executionStatusService;

    beforeEach(() => {
      executionStatusService = createActor(executionStatusMachine).start();
    });

    afterEach(() => {
      executionStatusService.stop();
    });

    test('should start in stopped state', () => {
      expect(executionStatusService.getSnapshot().value).toBe('stopped');
    });

    test('should transition to running on START', () => {
      executionStatusService.send({ type: 'START' });
      expect(executionStatusService.getSnapshot().value).toBe('running');
    });

    test('should pause and resume simulation', () => {
      // Start simulation
      executionStatusService.send({ type: 'START' });
      expect(executionStatusService.getSnapshot().value).toBe('running');

      // Pause simulation
      executionStatusService.send({ type: 'PAUSE' });
      expect(executionStatusService.getSnapshot().value).toBe('paused');

      // Resume simulation
      executionStatusService.send({ type: 'RESUME' });
      expect(executionStatusService.getSnapshot().value).toBe('running');
    });

    test('should stop simulation from any state', () => {
      // Test stopping from running
      executionStatusService.send({ type: 'START' });
      executionStatusService.send({ type: 'STOP' });
      expect(executionStatusService.getSnapshot().value).toBe('stopped');

      // Test stopping from paused
      executionStatusService.send({ type: 'START' });
      executionStatusService.send({ type: 'PAUSE' });
      executionStatusService.send({ type: 'STOP' });
      expect(executionStatusService.getSnapshot().value).toBe('stopped');
    });
  });

  describe('Hook Tests', () => {
    test('should provide correct state transitions', () => {
      const { result } = renderHook(() => useExecutionStatus());

      // Initial state
      expect(result.current.executionStatus).toBe('stopped');

      // Start simulation
      act(() => {
        result.current.start();
      });
      expect(result.current.executionStatus).toBe('running');

      // Pause simulation
      act(() => {
        result.current.pause();
      });
      expect(result.current.executionStatus).toBe('paused');

      // Resume simulation
      act(() => {
        result.current.resume();
      });
      expect(result.current.executionStatus).toBe('running');

      // Stop simulation
      act(() => {
        result.current.stop();
      });
      expect(result.current.executionStatus).toBe('stopped');
    });

    test('should handle toggleRunning correctly', () => {
      const { result } = renderHook(() => useExecutionStatus());

      // Toggle from stopped to running
      act(() => result.current.toggleRunning());
      expect(result.current.executionStatus).toBe('running');

      // Toggle from running to paused
      act(() => result.current.toggleRunning());
      expect(result.current.executionStatus).toBe('paused');

      // Toggle from paused to running
      act(() => result.current.toggleRunning());
      expect(result.current.executionStatus).toBe('running');
    });
  });
});
