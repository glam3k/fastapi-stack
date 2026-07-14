"""Add contact table for JCRM

Revision ID: eda0c5b8a9d3
Revises: fe56fa70289e
Create Date: 2024-07-19 14:30:00.000000

"""
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from alembic import op


# revision identifiers, used by Alembic.
revision = 'eda0c5b8a9d3'
down_revision = 'fe56fa70289e'
branch_labels = None
depends_on = None


def upgrade():
    """Create contacts table for JCRM"""
    # Create contacts table
    op.create_table(
        'contact',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('email', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('phone', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('category', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('linkedin_url', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('facebook_url', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('relationship_strength', sa.Integer(), nullable=False),
        sa.Column('first_met', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_contact_user_id'), 'contact', ['user_id'], unique=False)
    op.create_index(op.f('ix_contact_email'), 'contact', ['email'], unique=False)
    # Unique constraint: each user can only have one contact with the same email
    op.create_unique_constraint('uq_contact_user_email', 'contact', ['user_id', 'email'])


def downgrade():
    """Remove contacts table"""
    op.drop_constraint('uq_contact_user_email', 'contact', type_='unique')
    op.drop_index(op.f('ix_contact_email'), table_name='contact')
    op.drop_index(op.f('ix_contact_user_id'), table_name='contact')
    op.drop_table('contact')