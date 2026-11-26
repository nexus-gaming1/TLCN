import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
    socket,
    connectSocket,
    disconnectSocket,
} from '../socket/socket';

export function useMachineSocket({ onMachinesList, onMachineUpdated, onHeartbeat, onSessionTimeUpdated, onMemberBalanceUpdated } = {}) {
    const queryClient = useQueryClient();

    useEffect(() => {

        // Backend gửi toàn bộ danh sách máy
        const handleMachinesList = (machines) => {
            queryClient.setQueryData(
                ['machines'],
                machines
            );
            onMachinesList?.(machines);
        };

        // Backend gửi heartbeat riêng
        const handleHeartbeat = ({
            machineId,
            localIp,
            macAddress,
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
            onHeartbeat?.({ machineId, localIp, macAddress, performance });
        };

        const handleMachineUpdated = (machine) => {
            if (!machine?.machineId) {
                return;
            }

            queryClient.setQueryData(
                ['machines'],
                (old = {}) => ({
                    ...old,
                    [machine.machineId]: machine,
                })
            );
            onMachineUpdated?.(machine);
        };

        const handleSessionTimeUpdated = (data) => {
            if (data?.machineId) {
                queryClient.setQueryData(
                    ['machines'],
                    (old = {}) => {
                        const machine = old[data.machineId];
                        if (!machine) return old;
                        return {
                            ...old,
                            [data.machineId]: {
                                ...machine,
                                remainingMinutes: data.remainingMinutes,
                                realBalance: data.realBalance,
                                bonusBalance: data.bonusBalance,
                                totalBalance: data.totalBalance,
                                hasActiveCombo: data.hasActiveCombo
                            }
                        };
                    }
                );
            }
            onSessionTimeUpdated?.(data);
            if (data?.machineId) {
                onMachineUpdated?.({
                    machineId: data.machineId,
                    computerId: data.computerId,
                    memberId: data.memberId,
                    remainingMinutes: data.remainingMinutes,
                    realBalance: data.realBalance,
                    bonusBalance: data.bonusBalance,
                    hasActiveCombo: data.hasActiveCombo
                });
            }
        };

        const handleMemberBalanceUpdated = (data) => {
            onMemberBalanceUpdated?.(data);
        };

        socket.on(
            'machines:list',
            handleMachinesList
        );

        socket.on(
            'machine:heartbeat',
            handleHeartbeat
        );

        socket.on(
            'machine:updated',
            handleMachineUpdated
        );

        socket.on(
            'session:time_updated',
            handleSessionTimeUpdated
        );

        socket.on(
            'member:balance_updated',
            handleMemberBalanceUpdated
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

            socket.off(
                'machine:updated',
                handleMachineUpdated
            );

            socket.off(
                'session:time_updated',
                handleSessionTimeUpdated
            );

            socket.off(
                'member:balance_updated',
                handleMemberBalanceUpdated
            );

            disconnectSocket();
        };

    }, [onHeartbeat, onMachineUpdated, onMachinesList, onSessionTimeUpdated, onMemberBalanceUpdated, queryClient]);
}