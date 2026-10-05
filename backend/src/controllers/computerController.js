const computerService = require('../services/computerService');
const computerSocketService = require('../services/computerSocketService');
const machineStore = require('../stores/machineStore');
const stationControlService = require('../services/stationControlService');

/**
 * ComputerController
 * Handles HTTP requests and delegates logic to specialized Services (SRP & Clean Code)
 */
class ComputerController {
  async getRoomLayoutGrid(req, res, next) {
    try {
      const gridData = await computerService.getRoomLayoutGrid();
      return res.json({
        status: 'success',
        data: gridData,
        message: 'Lấy dữ liệu sơ đồ phòng máy thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async getZones(req, res, next) {
    try {
      const zones = await computerService.getAllZones();
      return res.json({
        status: 'success',
        data: zones,
        message: 'Lấy danh sách phân khu máy trạm thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async changeStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, member_id, notes } = req.body;
      const updatedStation = await stationControlService.changeStatus(id, status, member_id, notes);
      return res.json({
        status: 'success',
        data: updatedStation,
        message: `Đổi trạng thái trạm máy thành ${status} thành công`
      });
    } catch (error) {
      next(error);
    }
  }

  async switchStation(req, res, next) {
    try {
      const { id } = req.params;
      const { target_computer_id, member_id } = req.body;
      const result = await stationControlService.switchStation(id, target_computer_id, member_id);
      return res.json({
        status: 'success',
        data: result,
        message: 'Chuyển trạm máy thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async wakeOnLan(req, res, next) {
    try {
      const { zone_id } = req.body;
      const result = await stationControlService.wakeOnLan(zone_id);
      return res.json({
        status: 'success',
        data: result,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async getBootromLogs(req, res, next) {
    try {
      const { computer_id } = req.query;
      const logs = await stationControlService.getBootromLogs(computer_id);
      return res.json({
        status: 'success',
        data: logs,
        message: 'Lấy nhật ký kết nối Bootrom thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async getComputers(req, res, next) {
    try {
      const computers = await computerService.getAllComputers();

      return res.json({
        status: 'success',
        data: computers,
        message: 'Lấy danh sách máy trạm thành công'
      });
    } catch (error) {
      next(error);
    }
  }


  // GET /api/computers/:id
  async getComputerById(req, res, next) {
    try {
      const { id } = req.params;

      const computer = await computerService.getComputerById(id);

      if (!computer) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy máy trạm'
        });
      }

      return res.json({
        status: 'success',
        data: computer
      });
    } catch (error) {
      next(error);
    }
  }


  // POST /api/computers
  async createComputer(req, res, next) {
    try {
      const newComputer =
        await computerService.createComputer(req.body);

      return res.status(201).json({
        status: 'success',
        data: newComputer,
        message: 'Tạo máy trạm mới thành công'
      });
    } catch (error) {
      next(error);
    }
  }


  // PUT /api/computers/:id
  async updateComputer(req, res, next) {
    try {
      const { id } = req.params;

      const updated =
        await computerService.updateComputer(id, req.body);

      if (!updated) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy máy trạm để cập nhật'
        });
      }

      return res.json({
        status: 'success',
        data: updated,
        message: 'Cập nhật máy trạm thành công'
      });
    } catch (error) {
      next(error);
    }
  }


  // DELETE /api/computers/:id
  async deleteComputer(req, res, next) {
    try {
      const { id } = req.params;

      const deleted =
        await computerService.deleteComputer(id);

      if (!deleted) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy máy trạm để xóa'
        });
      }

      return res.json({
        status: 'success',
        message: 'Xóa máy trạm thành công'
      });
    } catch (error) {
      next(error);
    }
  }


  // GET /api/computers/hardware-specs
  async getHardwareSpecs(req, res, next) {
    try {
      const data =
        await computerService.getHardwareSpecs();

      return res.json({
        status: 'success',
        data,
        message: 'Lấy thông số cấu hình phần cứng thành công'
      });
    } catch (error) {
      next(error);
    }
  }


  // POST /api/computers/hardware-specs
  async createHardwareSpec(req, res, next) {
    try {
      const newSpec =
        await computerService.createHardwareSpec(req.body);

      return res.status(201).json({
        status: 'success',
        data: newSpec,
        message: 'Thêm cấu hình máy mới thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/machines/:machineId/login
  async login(req, res, next) {
    try {
      const { machineId } = req.params;
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({
          error: 'Username is required'
        });
      }

      const machine = machineStore.get(machineId);

      if (!machine || !machine.socketId) {
        return res.status(404).json({
          error: 'Machine is offline or not registered'
        });
      }

      console.log(
        `[REST API] Triggering session:login ` +
        `for machine ${machineId} ` +
        `with user '${username}'`
      );

      computerSocketService.login(
        machineId,
        username
      );

      return res.json({
        success: true,
        message: `Login request sent to ${machineId}`
      });
    } catch (error) {
      next(error);
    }
  }

  async updateHardwareSpec(req, res, next) {
          try {
            const { id } = req.params;
            const updated = await computerService.updateHardwareSpec(id, req.body);
            if (!updated) {
              return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy máy trạm để cập nhật cấu hình'
              });
            }
            return res.json({
              status: 'success',
              data: updated,
              message: 'Cập nhật cấu hình máy thành công'

            });
          } catch (error) {
            next(error);
          }
        }

  // POST /api/machines/:machineId/logout
  async logout(req, res, next) {
          try {
            const { machineId } = req.params;

            const machine = machineStore.get(machineId);

            if (!machine || !machine.socketId) {
              return res.status(404).json({
                error: 'Machine is offline or not registered'
              });
            }

            console.log(
              `[REST API] Triggering session:logout ` +
              `for machine ${machineId}`
            );

            computerSocketService.logout(machineId);

            return res.json({
              success: true,
              message: `Logout request sent to ${machineId}`
            });
          } catch (error) {
            next(error);
          }
        }


  // POST /api/machines/:machineId/command
  async sendCommand(req, res, next) {
          try {
            const { machineId } = req.params;
            const { command, message } = req.body;

            if (!command) {
              return res.status(400).json({
                error: 'Command is required'
              });
            }
            console.log("MAchineID" + machineId);
            const machine = machineStore.get(machineId);

            if (!machine || !machine.socketId) {
              return res.status(404).json({
                error: 'Machine is offline or not registered'
              });
            }

            console.log(
              `[REST API] Sending command '${command}' ` +
              `to machine ${machineId}`
            );

            computerSocketService.sendCommand(
              machineId,
              command,
              message
            );

            return res.json({
              success: true,
              message:
                `Command '${command}' sent to ${machineId}`
            });
          } catch (error) {
            next(error);
          }
        }


  // POST /api/machines/:machineId/notification
  async sendNotification(req, res, next) {
          try {
            const { machineId } = req.params;

            const {
              title,
              message,
              durationSeconds
            } = req.body;

            if (!message) {
              return res.status(400).json({
                error: 'Message is required'
              });
            }

            const machine = machineStore.get(machineId);

            if (!machine || !machine.socketId) {
              return res.status(404).json({
                error: 'Machine is offline or not registered'
              });
            }

            computerSocketService.sendNotification(
              machineId,
              title || 'Thông báo hệ thống',
              message,
              durationSeconds || 5
            );

            return res.json({
              success: true,
              message:
                `Notification sent to ${machineId}`
            });
          } catch (error) {
            next(error);
          }
        }


  // POST /api/commands/broadcast
  async broadcastCommand(req, res, next) {
          try {
            const {
              type,
              command,
              title,
              message
            } = req.body;

            // Broadcast notification
            if (type === 'notification' || message) {
              computerSocketService.broadcastNotification(
                title || 'Thông báo toàn hệ thống',
                message || '',
                5
              );

              console.log(
                '[REST API] Broadcasted notification ' +
                'to all machines'
              );

              return res.json({
                success: true,
                message:
                  'Broadcast notification sent to all machines'
              });
            }

            // Broadcast command
            if (command) {
              computerSocketService.broadcastCommand(
                command
              );

              console.log(
                `[REST API] Broadcasted command '${command}' ` +
                `to all machines`
              );

              return res.json({
                success: true,
                message:
                  `Broadcast command '${command}' ` +
                  `sent to all machines`
              });
            }

            return res.status(400).json({
              error: 'Invalid broadcast request parameters'
            });
          } catch (error) {
            next(error);
          }
  }

  async deleteHardwareSpec(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await computerService.deleteHardwareSpec(id);
      if (!deleted) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy máy trạm để xóa cấu hình'
        });
      }
      return res.json({
        status: 'success',
        message: 'Xóa cấu hình máy thành công'
      });
    } catch (error) {
      next(error);
    }
  }
}


module.exports = new ComputerController();



