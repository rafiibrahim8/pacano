import { Sequelize, Model, DataTypes } from 'sequelize';
import { Repo } from '../types';

class RepoModel extends Model<Repo> implements Repo {
  public name!: string;
  public useMirror!: string;
  public etag: string | undefined;
  public lastModified: string | undefined;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

const defineRepoModel = (sequelize: Sequelize): void => {
  RepoModel.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      useMirror: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      etag: {
        type: DataTypes.STRING,
      },
      lastModified: {
        type: DataTypes.STRING,
      },
    },
    {
      sequelize,
      tableName: 'repos',
    },
  );
};

export { RepoModel, defineRepoModel };
