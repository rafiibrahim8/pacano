import { Sequelize, Model, DataTypes } from 'sequelize';
import { Package } from '../types';
import { RepoModel } from './repoModel';

class PackageModel extends Model<Package> implements Package {
  public name!: string;
  public repo!: string;
  public version!: string;
  public fileName!: string;
  public downloadSize!: number;
  public installSize!: number;
  public timesUpdated!: number;
  public md5sum: string | undefined;
  public sha256sum: string | undefined;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

const definePackageModel = (sequelize: Sequelize): void => {
  PackageModel.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      repo: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: RepoModel,
          key: 'name',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      version: {
        type: DataTypes.STRING,
      },
      fileName: {
        type: DataTypes.STRING,
      },
      downloadSize: {
        type: DataTypes.INTEGER,
      },
      installSize: {
        type: DataTypes.INTEGER,
      },
      timesUpdated: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      md5sum: {
        type: DataTypes.STRING,
      },
      sha256sum: {
        type: DataTypes.STRING,
      },
    },
    {
      sequelize,
      tableName: 'packages',
    },
  );
};

export { PackageModel, definePackageModel };
