import { Request, Response } from "express";

export const getUsers = (req: Request, res: Response) => {
  res.json({ message: "Get users endpoint" });
};

export const createUser = (req: Request, res: Response) => {
  res.json({ message: "Create user endpoint" });
};

export const updateUser = (req: Request, res: Response) => {
  res.json({ message: "Update user endpoint" });
};

export const deleteUser = (req: Request, res: Response) => {
  res.json({ message: "Delete user endpoint" });
};
