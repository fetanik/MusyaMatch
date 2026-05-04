import { BasicUser } from '../models/BasicUser.js';

export async function getUserProfile(req, res, next) {
  try {
    const { id } = req.params;

    const user = await BasicUser.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      id: user.id,
      firstName: user.firstName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      instagram: user.instagram,
      facebook: user.facebook,
      telegram: user.telegram,
      photo: user.photo,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUserProfile(req, res, next) {
  try {
    const { id } = req.params;
    const {
      firstName,
      email,
      phone,
      address,
      instagram,
      facebook,
      telegram,
      photo,
      password,
    } = req.body;

    const user = await BasicUser.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.update({
      firstName: firstName !== undefined ? firstName.trim() : user.firstName,
      email: email !== undefined ? email.trim() : user.email,
      phone: phone !== undefined ? phone.trim() : user.phone,
      address: address !== undefined ? address.trim() : user.address,
      instagram: instagram !== undefined ? instagram.trim() : user.instagram,
      facebook: facebook !== undefined ? facebook.trim() : user.facebook,
      telegram: telegram !== undefined ? telegram.trim() : user.telegram,
      photo: photo !== undefined ? photo : user.photo,
      password: password && password.trim() ? password.trim() : user.password,
    });

    return res.json({
      id: user.id,
      firstName: user.firstName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      instagram: user.instagram,
      facebook: user.facebook,
      telegram: user.telegram,
      photo: user.photo,
    });
  } catch (err) {
    next(err);
  }
}