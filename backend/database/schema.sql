-- Nexo: esquema inicial vacío para MariaDB 10.4.32 (XAMPP).
-- Este archivo crea una base NUEVA. No usa DROP, TRUNCATE, INSERT ni IF NOT EXISTS.
-- Si nexo_social ya existe, no continuar: usar migraciones revisadas en lugar de sobrescribirla.
-- Todos los identificadores de entidad son UUID string generados por la futura aplicación.
-- Los permisos, el alta de cuentas y la lógica social NO se implementan en este esquema.

CREATE DATABASE nexo_social CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nexo_social;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';

CREATE TABLE users (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  email VARCHAR(254) NOT NULL,
  handle VARCHAR(30) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  password_hash VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status ENUM('active', 'suspended', 'deactivated') NOT NULL DEFAULT 'active',
  email_verified_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_handle (handle),
  KEY ix_users_status_created (status, created_at, id),
  CONSTRAINT ck_users_email CHECK (CHAR_LENGTH(TRIM(email)) BETWEEN 3 AND 254),
  CONSTRAINT ck_users_handle CHECK (handle REGEXP '^[a-zA-Z0-9_]{3,30}$'),
  CONSTRAINT ck_users_password_hash CHECK (CHAR_LENGTH(password_hash) >= 20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
CREATE TABLE media_files (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  owner_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  storage_provider VARCHAR(32) CHARACTER SET ascii NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(127) CHARACTER SET ascii NOT NULL,
  media_kind ENUM('image', 'video', 'audio', 'document') NOT NULL DEFAULT 'image',
  byte_size BIGINT UNSIGNED NOT NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_media_storage (storage_provider, storage_key),
  KEY ix_media_owner_created (owner_id, created_at, id),
  CONSTRAINT fk_media_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_media_size CHECK (byte_size > 0),
  CONSTRAINT ck_media_width CHECK (width IS NULL OR width > 0),
  CONSTRAINT ck_media_height CHECK (height IS NULL OR height > 0),
  CONSTRAINT ck_media_sha256 CHECK (sha256 IS NULL OR sha256 REGEXP '^[a-fA-F0-9]{64}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE user_profiles (
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  bio VARCHAR(1000) NULL,
  location VARCHAR(160) NULL,
  website VARCHAR(2048) NULL,
  avatar_media_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  cover_media_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  KEY ix_profiles_display_name (display_name),
  KEY ix_profiles_avatar (avatar_media_id),
  KEY ix_profiles_cover (cover_media_id),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_profiles_avatar FOREIGN KEY (avatar_media_id) REFERENCES media_files (id) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT fk_profiles_cover FOREIGN KEY (cover_media_id) REFERENCES media_files (id) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT ck_profiles_name CHECK (CHAR_LENGTH(TRIM(display_name)) BETWEEN 2 AND 80)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE user_follows (
  follower_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  followed_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (follower_id, followed_id),
  KEY ix_follows_followed_created (followed_id, created_at, follower_id),
  KEY ix_follows_follower_created (follower_id, created_at, followed_id),
  CONSTRAINT fk_follows_follower FOREIGN KEY (follower_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_follows_followed FOREIGN KEY (followed_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_follows_distinct CHECK (follower_id <> followed_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE communities (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  owner_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  slug VARCHAR(80) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(80) NULL,
  visibility ENUM('public', 'private') NOT NULL DEFAULT 'public',
  cover_media_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_communities_slug (slug),
  KEY ix_communities_owner (owner_id),
  KEY ix_communities_category_created (category, created_at, id),
  KEY ix_communities_visibility_created (visibility, deleted_at, created_at, id),
  KEY ix_communities_cover (cover_media_id),
  CONSTRAINT fk_communities_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_communities_cover FOREIGN KEY (cover_media_id) REFERENCES media_files (id) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT ck_communities_name CHECK (CHAR_LENGTH(TRIM(name)) BETWEEN 2 AND 120),
  CONSTRAINT ck_communities_slug CHECK (slug REGEXP '^[a-zA-Z0-9][a-zA-Z0-9_-]{1,79}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE community_members (
  community_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  role ENUM('owner', 'moderator', 'member') NOT NULL DEFAULT 'member',
  joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (community_id, user_id),
  KEY ix_members_user_joined (user_id, joined_at, community_id),
  KEY ix_members_role (community_id, role, joined_at),
  CONSTRAINT fk_members_community FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE posts (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  author_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  community_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  content TEXT NULL,
  category VARCHAR(80) NULL,
  visibility ENUM('public', 'followers', 'community') NOT NULL DEFAULT 'public',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY ix_posts_feed (deleted_at, visibility, created_at, id),
  KEY ix_posts_author_created (author_id, deleted_at, created_at, id),
  KEY ix_posts_community_created (community_id, deleted_at, created_at, id),
  KEY ix_posts_category_created (category, deleted_at, created_at, id),
  CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_posts_community FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_posts_content CHECK (content IS NULL OR CHAR_LENGTH(TRIM(content)) BETWEEN 1 AND 3000),
  CONSTRAINT ck_posts_visibility CHECK ((community_id IS NULL AND visibility IN ('public', 'followers')) OR (community_id IS NOT NULL AND visibility = 'community'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE post_media (
  post_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  media_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  position SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  alt_text VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (post_id, media_id),
  UNIQUE KEY uq_post_media_position (post_id, position),
  KEY ix_post_media_file (media_id),
  CONSTRAINT fk_post_media_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_post_media_file FOREIGN KEY (media_id) REFERENCES media_files (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE comments (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  post_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  author_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  parent_comment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  content TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_comments_post_id (post_id, id),
  KEY ix_comments_post_parent_created (post_id, parent_comment_id, created_at, id),
  KEY ix_comments_author_created (author_id, created_at, id),
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_comments_parent_same_post FOREIGN KEY (post_id, parent_comment_id) REFERENCES comments (post_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_comments_content CHECK (CHAR_LENGTH(TRIM(content)) BETWEEN 1 AND 1000),
  CONSTRAINT ck_comments_not_self CHECK (parent_comment_id IS NULL OR parent_comment_id <> id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE post_reactions (
  post_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  reaction ENUM('like', 'love', 'insightful', 'celebrate', 'curious') NOT NULL DEFAULT 'like',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (post_id, user_id),
  KEY ix_post_reactions_user (user_id, created_at, post_id),
  KEY ix_post_reactions_kind (post_id, reaction),
  CONSTRAINT fk_post_reactions_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_post_reactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE comment_reactions (
  comment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  reaction ENUM('like', 'love', 'insightful', 'celebrate', 'curious') NOT NULL DEFAULT 'like',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (comment_id, user_id),
  KEY ix_comment_reactions_user (user_id, created_at, comment_id),
  KEY ix_comment_reactions_kind (comment_id, reaction),
  CONSTRAINT fk_comment_reactions_comment FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_comment_reactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE post_bookmarks (
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  post_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, post_id),
  KEY ix_bookmarks_user_created (user_id, created_at, post_id),
  KEY ix_bookmarks_post (post_id),
  CONSTRAINT fk_bookmarks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_bookmarks_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE projects (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  author_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  visibility ENUM('public', 'followers') NOT NULL DEFAULT 'public',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY ix_projects_author_created (author_id, deleted_at, created_at, id),
  KEY ix_projects_status_created (status, visibility, created_at, id),
  CONSTRAINT fk_projects_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_projects_title CHECK (CHAR_LENGTH(TRIM(title)) BETWEEN 1 AND 160),
  CONSTRAINT ck_projects_description CHECK (CHAR_LENGTH(TRIM(description)) BETWEEN 1 AND 20000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE project_media (
  project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  media_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  position SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  alt_text VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (project_id, media_id),
  UNIQUE KEY uq_project_media_position (project_id, position),
  KEY ix_project_media_file (media_id),
  CONSTRAINT fk_project_media_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_project_media_file FOREIGN KEY (media_id) REFERENCES media_files (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE conversations (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  kind ENUM('direct', 'group') NOT NULL,
  title VARCHAR(160) NULL,
  created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  direct_user_low CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  direct_user_high CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_conversations_direct_pair (direct_user_low, direct_user_high),
  KEY ix_conversations_creator (created_by),
  KEY ix_conversations_direct_high (direct_user_high),
  KEY ix_conversations_updated (updated_at, id),
  CONSTRAINT fk_conversations_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_conversations_direct_low FOREIGN KEY (direct_user_low) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_conversations_direct_high FOREIGN KEY (direct_user_high) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_conversations_kind CHECK ((kind = 'group' AND direct_user_low IS NULL AND direct_user_high IS NULL) OR (kind = 'direct' AND direct_user_low IS NOT NULL AND direct_user_high IS NOT NULL AND direct_user_low < direct_user_high))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE conversation_members (
  conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  left_at DATETIME(3) NULL,
  last_read_at DATETIME(3) NULL,
  PRIMARY KEY (conversation_id, user_id),
  KEY ix_conversation_members_user (user_id, left_at, conversation_id),
  CONSTRAINT fk_conversation_members_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_conversation_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_conversation_members_left CHECK (left_at IS NULL OR left_at >= joined_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE messages (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  sender_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  reply_to_message_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  content TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_messages_conversation_id (conversation_id, id),
  KEY ix_messages_conversation_created (conversation_id, created_at, id),
  KEY ix_messages_sender_membership (conversation_id, sender_id),
  KEY ix_messages_reply (conversation_id, reply_to_message_id),
  KEY ix_messages_sender_created (sender_id, created_at, id),
  CONSTRAINT fk_messages_sender_membership FOREIGN KEY (conversation_id, sender_id) REFERENCES conversation_members (conversation_id, user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_messages_reply_same_conversation FOREIGN KEY (conversation_id, reply_to_message_id) REFERENCES messages (conversation_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_messages_content CHECK (content IS NULL OR CHAR_LENGTH(TRIM(content)) BETWEEN 1 AND 10000),
  CONSTRAINT ck_messages_not_self CHECK (reply_to_message_id IS NULL OR reply_to_message_id <> id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE message_media (
  message_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  media_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  position SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (message_id, media_id),
  UNIQUE KEY uq_message_media_position (message_id, position),
  KEY ix_message_media_file (media_id),
  CONSTRAINT fk_message_media_message FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_message_media_file FOREIGN KEY (media_id) REFERENCES media_files (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE notifications (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recipient_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  kind ENUM('post_reaction', 'comment_reaction', 'comment', 'reply', 'follow', 'community', 'message', 'system') NOT NULL,
  body VARCHAR(500) NULL,
  post_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  comment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  community_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  message_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  deduplication_key VARBINARY(128) NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_notifications_deduplication (deduplication_key),
  KEY ix_notifications_recipient_read_created (recipient_id, read_at, created_at, id),
  KEY ix_notifications_actor (actor_id),
  KEY ix_notifications_post_comment (post_id, comment_id),
  KEY ix_notifications_community (community_id),
  KEY ix_notifications_conversation_message (conversation_id, message_id),
  CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT fk_notifications_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_notifications_comment_same_post FOREIGN KEY (post_id, comment_id) REFERENCES comments (post_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_notifications_community FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_notifications_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_notifications_message_same_conversation FOREIGN KEY (conversation_id, message_id) REFERENCES messages (conversation_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_notifications_comment_target CHECK (comment_id IS NULL OR post_id IS NOT NULL),
  CONSTRAINT ck_notifications_message_target CHECK (message_id IS NULL OR conversation_id IS NOT NULL),
  CONSTRAINT ck_notifications_required_target CHECK (
    (kind = 'post_reaction' AND post_id IS NOT NULL) OR
    (kind IN ('comment_reaction', 'comment', 'reply') AND comment_id IS NOT NULL) OR
    (kind = 'community' AND community_id IS NOT NULL) OR
    (kind = 'message' AND message_id IS NOT NULL) OR
    kind IN ('follow', 'system')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
