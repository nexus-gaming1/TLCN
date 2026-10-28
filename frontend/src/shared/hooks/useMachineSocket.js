import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
    socket,
    connectSocket,
    disconnectSocket,
} from '../socket/socket';

export function useMachineSocket() {
    const queryClient = useQueryClient();

    useEffect(() => {

        // Backend gửi toàn bộ danh sách máy
        const handleMachinesList = (machines) => {
            queryClient.setQueryData(
                ['machines'],
                machines
            );
        };

        // Backend gửi heartbeat riêng
        const handleHeartbeat = ({
            machineId,
            performance,
        }) => {
            queryClient.setQueryData(
                ['machines'],
                (old = {}) => {

                    const machine = old[machineId];

                    if (!machine) {
                        return old;
                    }

                    return {
                        ...old,

                        [machineId]: {
                            ...machine,
                            performance,
                        },
                    };
                }
            );
        };

        socket.on(
            'machines:list',
            handleMachinesList
        );

        socket.on(
            'machine:heartbeat',
            handleHeartbeat
        );

        connectSocket();

        return () => {
            socket.off(
                'machines:list',
                handleMachinesList
            );

            socket.off(
                'machine:heartbeat',
                handleHeartbeat
            );

            disconnectSocket();
        };

    }, [queryClient]);
}