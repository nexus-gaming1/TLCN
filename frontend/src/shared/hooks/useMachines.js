import { useQuery } from '@tanstack/react-query';
import machineApi from '../api/machine.service';

export function useMachines() {
  return useQuery({
    queryKey: ['machines'],
    queryFn: machineApi.getMachineStore,
  });
}