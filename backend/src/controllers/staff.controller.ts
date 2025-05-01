import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma, Role } from '@prisma/client';
import { deleteFile } from '../services/file.service';

const prisma = new PrismaClient();

export class StaffController {
    // Lấy danh sách tất cả nhân viên (Admin/Staff)
    async getAllStaff(req: Request, res: Response, next: NextFunction) {
        try {
            const staffProfiles = await prisma.staffProfile.findMany({
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            isActive: true,
                            role: true,
                            avatar: true
                        }
                    },
                    managedBuilding: true
                },
                orderBy: {
                    fullName: 'asc'
                }
            });

            res.status(200).json({
                status: 'success',
                results: staffProfiles.length,
                data: staffProfiles
            });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách nhân viên:', error);
            next(error);
        }
    }

    // Lấy thông tin chi tiết một nhân viên bằng Profile ID
    async getStaffById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return next(new Error('ID hồ sơ nhân viên không hợp lệ'));
            }

            const staff = await prisma.staffProfile.findUnique({
                where: { id: id },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            isActive: true,
                            role: true,
                            avatar: true
                        }
                    },
                    managedBuilding: true
                }
            });

            if (!staff) {
                return next(new Error(`Không tìm thấy hồ sơ nhân viên với ID ${id}`));
            }

            res.status(200).json({
                status: 'success',
                data: staff
            });
        } catch (error) {
            console.error('Lỗi khi lấy chi tiết nhân viên:', error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return next(new Error(`Không tìm thấy hồ sơ nhân viên với ID ${req.params.id}`));
            }
            next(error);
        }
    }

    // Cập nhật thông tin nhân viên
    async updateStaff(req: Request, res: Response, next: NextFunction) {
        try {
            const profileId = parseInt(req.params.id);
            if (isNaN(profileId)) {
                return next(new Error('ID hồ sơ nhân viên không hợp lệ'));
            }

            const { avatarId, managedBuildingId, ...profileData } = req.body;

            // Tìm profile và user liên quan để kiểm tra tồn tại và lấy userId, avatar cũ
            const currentProfile = await prisma.staffProfile.findUnique({
                where: { id: profileId },
                include: { user: { select: { id: true, avatarId: true } } }
            });

            if (!currentProfile || !currentProfile.user) {
                return next(new Error(`Không tìm thấy hồ sơ nhân viên với ID ${profileId}`));
            }

            const userId = currentProfile.user.id;
            const currentAvatarId = currentProfile.user.avatarId;

            let oldAvatarPath: string | null = null;

            // Transaction để đảm bảo tính toàn vẹn dữ liệu
            const updatedProfile = await prisma.$transaction(async (tx) => {
                // Xử lý cập nhật Avatar
                if (avatarId !== undefined) {
                    const newAvatarId = avatarId ? parseInt(avatarId) : null;

                    if (currentAvatarId !== newAvatarId) {
                        await tx.user.update({
                            where: { id: userId },
                            data: { avatarId: newAvatarId },
                        });

                        if (currentAvatarId && currentAvatarId !== newAvatarId) {
                            const oldAvatar = await tx.media.findUnique({ where: { id: currentAvatarId } });
                            if (oldAvatar) {
                                oldAvatarPath = oldAvatar.path;
                                await tx.media.delete({ where: { id: currentAvatarId } });
                            }
                        }
                    }
                }

                // Chuẩn bị dữ liệu cập nhật cho StaffProfile
                const staffUpdateData: Prisma.StaffProfileUpdateInput = {
                    fullName: profileData.fullName,
                    gender: profileData.gender,
                    birthDate: profileData.birthDate ? new Date(profileData.birthDate) : undefined,
                    identityCardNumber: profileData.identityCardNumber,
                    phoneNumber: profileData.phoneNumber,
                    position: profileData.position,
                    address: profileData.address,
                    managedBuilding: managedBuildingId !== undefined
                        ? (managedBuildingId ? { connect: { id: parseInt(managedBuildingId) } } : { disconnect: true })
                        : undefined
                };

                // Cập nhật StaffProfile
                const profileAfterUpdate = await tx.staffProfile.update({
                    where: { id: profileId },
                    data: staffUpdateData,
                    include: {
                        user: { select: { id: true, email: true, isActive: true, role: true, avatar: true } },
                        managedBuilding: true
                    }
                });

                return profileAfterUpdate;
            });

            // Xóa file vật lý của avatar cũ (nếu có)
            if (oldAvatarPath && typeof deleteFile === 'function') {
                deleteFile(oldAvatarPath);
            } else if (oldAvatarPath) {
                console.warn(`deleteFile function not available, cannot delete old avatar: ${oldAvatarPath}`);
            }

            res.status(200).json({
                status: 'success',
                message: 'Thông tin nhân viên đã được cập nhật',
                data: updatedProfile
            });

        } catch (error: any) {
            console.error('Lỗi khi cập nhật nhân viên:', error);
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    const fields = (error.meta?.target as string[])?.join(', ');
                    return next(new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`));
                } else if (error.code === 'P2025') {
                    return next(new Error(`Không tìm thấy hồ sơ nhân viên hoặc tài nguyên liên quan (ID: ${req.params.id})`));
                }
            }
            next(error);
        }
    }

    // Các phương thức khác như tạo mới (createStaff) và xóa (deleteStaff) có thể được thêm vào tương tự
}