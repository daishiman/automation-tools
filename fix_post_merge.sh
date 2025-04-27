#!/bin/bash

# マイグレーションファイルのパターンを修正する
sed -i "" "s/migrations\\|schema.sql\\|db\\/schema/migrations\\|schema.sql\\|db\\/schema\\|migrate.js\\|database-migration/g" .husky/post-merge

echo "post-mergeスクリプトのパターンを更新しました"
