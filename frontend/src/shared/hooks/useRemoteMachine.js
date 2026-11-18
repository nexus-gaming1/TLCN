import { useQuery } from '@tanstack/react-query';
import MachineService from '../../shared/api/machine.service';

export const useStations = () => {
    return useQuery({
        queryKey: ['remote-stations'],
        queryFn: MachineService.getRemoteMachines,
        staleTime: 30 * 1000,
        refetchOnWindowFocus: true,
    });
};