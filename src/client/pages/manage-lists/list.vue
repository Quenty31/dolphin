<template>
<div class="dp-list-page">
	<transition name="zoom" mode="out-in">
		<div v-if="list" :key="list.id" class="_section list">
			<div class="title">{{ list.name }}</div>
			<div class="content">
				<div class="users">
					<div class="user" v-for="(user, i) in users" :key="user.id" :data-index="i">
						<dp-avatar :user="user" class="avatar"/>
						<div class="body">
							<dp-user-name :user="user" class="name"/>
							<dp-acct :user="user" class="acct"/>
						</div>
						<div class="action">
							<button class="_button" @click="removeUser(user)"><fa :icon="faTimes"/></button>
						</div>
					</div>
				</div>
			</div>
			<div class="footer">
				<x-button inline @click="renameList()">{{ $t('renameList') }}</x-button>
				<x-button inline @click="deleteList()">{{ $t('deleteList') }}</x-button>
			</div>
		</div>
	</transition>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import i18n from '../../i18n';
import Progress from '../../scripts/loading';
import XButton from '../../components/ui/button.vue';

export default Vue.extend({
	i18n,

	metaInfo() {
		return {
			title: this.list ? `${this.list.name} | ${this.$t('manageLists')}` : this.$t('manageLists')
		};
	},

	components: {
		XButton
	},

	data() {
		return {
			list: null,
			users: [],
			faTimes
		};
	},

	watch: {
		$route: 'fetch'
	},

	created() {
		this.fetch();
	},

	methods: {
		fetch() {
			Progress.start();
			this.$root.api('users/lists/show', {
				listId: this.$route.params.list
			}).then(list => {
				this.list = list;
				this.$root.api('users/show', {
					userIds: this.list.userIds
				}).then(users => {
					this.users = users;
					Progress.done();
				});
			});
		},

		removeUser(user) {
			this.$root.api('users/lists/pull', {
				listId: this.list.id,
				userId: user.id
			}).then(() => {
				this.users = this.users.filter(x => x.id !== user.id);
			});
		},

		async renameList() {
			const { canceled, result: name } = await this.$root.dialog({
				title: this.$t('enterListName'),
				input: {
					default: this.list.name
				}
			});
			if (canceled) return;

			await this.$root.api('users/lists/update', {
				listId: this.list.id,
				name: name
			});

			this.list.name = name;
		},

		async deleteList() {
			const { canceled } = await this.$root.dialog({
				type: 'warning',
				text: this.$t('deleteListConfirm', { list: this.list.name }),
				showCancelButton: true
			});
			if (canceled) return;

			this.$root.api('users/lists/delete', {
				listId: this.list.id
			}).then(() => {
				this.$root.dialog({
					type: 'success',
					splash: true
				});
				this.$router.push('/manage-lists');
			});
		}
	}
});
</script>

<style lang="scss" scoped>
.dp-list-page {
	> .list {
		> .content {
			max-height: 400px;
			overflow: auto;

			> .users {
				> .user {
					display: flex;
					align-items: center;

					> .avatar {
						width: 50px;
						height: 50px;
					}

					> .body {
						flex: 1;
						padding: 8px;

						> .name {
							display: block;
							font-weight: bold;
						}

						> .acct {
							opacity: 0.5;
						}
					}
				}
			}
		}
	}
}
</style>
