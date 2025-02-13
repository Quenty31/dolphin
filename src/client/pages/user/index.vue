<template>
<div class="dp-user-page" v-if="user">
	<transition name="zoom" mode="out-in" appear>
		<div class="profile _panel" :key="user.id">
			<div class="banner-container" :style="style">
				<div class="banner" ref="banner" :style="style"></div>
				<div class="fade"></div>
				<div class="title">
					<dp-user-name class="name" :user="user" :nowrap="true"/>
					<div>
						<span class="username"><dp-acct :user="user" :detail="true" /></span>
						<span v-if="user.isBot" :title="$t('is-bot')"><fa icon="robot"/></span>
					</div>
				</div>
				<span class="followed" v-if="$store.getters.isSignedIn && $store.state.i.id != user.id && user.isFollowed">{{ $t('followsYou') }}</span>
				<div class="actions" v-if="$store.getters.isSignedIn">
					<button @click="menu" class="menu _button" ref="menu"><fa :icon="faEllipsisH"/></button>
					<x-follow-button v-if="$store.state.i.id != user.id" :user="user" :inline="true" :transparent="false" class="follow"/>
				</div>
			</div>
			<dp-avatar class="avatar" :user="user" :disable-preview="true"/>
			<div class="title">
				<dp-user-name :user="user" :nowrap="false" class="name"/>
				<div>
					<span class="username"><dp-acct :user="user" :detail="true" /></span>
					<span v-if="user.isBot" :title="$t('is-bot')"><fa icon="robot"/></span>
				</div>
			</div>
			<div class="description">
				<mfm v-if="user.description" :text="user.description" :is-note="false" :author="user" :i="$store.state.i" :custom-emojis="user.emojis"/>
				<p v-else class="empty">{{ $t('noAccountDescription') }}</p>
			</div>
			<div class="fields" v-if="user.fields.length > 0">
				<dl class="field" v-for="(field, i) in user.fields" :key="i">
					<dt class="name">
						<mfm :text="field.name" :plain="true" :custom-emojis="user.emojis" :colored="false"/>
					</dt>
					<dd class="value">
						<mfm :text="field.value" :author="user" :i="$store.state.i" :custom-emojis="user.emojis" :colored="false"/>
					</dd>
				</dl>
			</div>
			<div class="status" v-if="user.host === null">
				<router-link :to="user | userPage()" :class="{ active: $route.name === 'user' }">
					<b>{{ user.notesCount | number }}</b>
					<span>{{ $t('notes') }}</span>
				</router-link>
				<router-link :to="user | userPage('following')" :class="{ active: $route.name === 'userFollowing' }">
					<b>{{ user.followingCount | number }}</b>
					<span>{{ $t('following') }}</span>
				</router-link>
				<router-link :to="user | userPage('followers')" :class="{ active: $route.name === 'userFollowers' }">
					<b>{{ user.followersCount | number }}</b>
					<span>{{ $t('followers') }}</span>
				</router-link>
			</div>
		</div>
	</transition>
	<router-view :user="user"></router-view>
	<template v-if="$route.name == 'user'">
		<sequential-entrance class="pins">
			<x-note v-for="(note, i) in user.pinnedNotes" class="note" :note="note" :key="note.id" :data-index="i" :detail="true" :pinned="true"/>
		</sequential-entrance>
		<x-user-timeline :user="user"/>
	</template>
</div>
<div v-else-if="error">
	<dp-error @retry="fetch()"/>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { faEllipsisH } from '@fortawesome/free-solid-svg-icons';
import XUserTimeline from './index.timeline.vue';
import XUserMenu from '../../components/user-menu.vue';
import XNote from '../../components/note.vue';
import XFollowButton from '../../components/follow-button.vue';
import Progress from '../../scripts/loading';
import parseAcct from '../../../misc/acct/parse';

export default Vue.extend({
	components: {
		XUserTimeline,
		XNote,
		XFollowButton,
	},

	metaInfo() {
		return {
			title: this.user ? '@' + Vue.filter('acct')(this.user).replace('@', ' | ') : null
		};
	},

	data() {
		return {
			user: null,
			error: null,
			faEllipsisH
		};
	},

	computed: {
		style(): any {
			if (this.user.bannerUrl == null) return {};
			return {
				backgroundImage: `url(${ this.user.bannerUrl })`
			};
		},
	},

	watch: {
		$route: 'fetch'
	},

	created() {
		this.fetch();
	},

	mounted() {
		window.addEventListener('load', this.onScroll);
		window.addEventListener('scroll', this.onScroll, { passive: true });
		window.addEventListener('resize', this.onScroll);
	},

	beforeDestroy() {
		window.removeEventListener('load', this.onScroll);
		window.removeEventListener('scroll', this.onScroll);
		window.removeEventListener('resize', this.onScroll);
	},

	methods: {
		fetch() {
			Progress.start();
			this.$root.api('users/show', parseAcct(this.$route.params.user)).then(user => {
				this.user = user;
			}).catch(e => {
				this.error = e;
			}).finally(() => {
				Progress.done();
			});
		},

		menu() {
			this.$root.new(XUserMenu, {
				source: this.$refs.menu,
				user: this.user
			});
		},

		onScroll() {
			const banner = this.$refs.banner as any;
			if (banner == null) return;

			const top = window.scrollY;

			const z = 1.75; // 奥行き(小さいほど奥)
			const pos = -(top / z);
			banner.style.backgroundPosition = `center calc(50% - ${pos}px)`;

			const blur = top / 32
			if (blur <= 10) banner.style.filter = `blur(${blur}px)`;
		},
	}
});
</script>

<style lang="scss" scoped>
@import '../../theme';

.dp-user-page {
	> .profile {
		position: relative;
		margin-bottom: 16px;
		overflow: hidden;

		@media (max-width: 500px) {
			margin-bottom: 8px;
		}

		> .banner-container {
			position: relative;
			height: 250px;
			overflow: hidden;
			background-size: cover;
			background-position: center;

			@media (max-width: 500px) {
				height: 140px;
			}

			> .banner {
				height: 100%;
				background-color: #4c5e6d;
				background-size: cover;
				background-position: center;
				box-shadow: 0 0 128px rgba(0, 0, 0, 0.5) inset;
			}

			> .fade {
				position: absolute;
				bottom: 0;
				left: 0;
				width: 100%;
				height: 78px;
				background: linear-gradient(transparent, rgba(#000, 0.7));

				@media (max-width: 500px) {
					display: none;
				}
			}

			> .followed {
				position: absolute;
				top: 12px;
				left: 12px;
				padding: 4px 6px;
				color: #fff;
				background: rgba(0, 0, 0, 0.7);
				font-size: 12px;
			}

			> .actions {
				position: absolute;
				top: 12px;
				right: 12px;
				-webkit-backdrop-filter: blur(8px);
				backdrop-filter: blur(8px);
				background: rgba(0, 0, 0, 0.2);
				padding: 8px;
				border-radius: 24px;
		
				> .menu {
					vertical-align: bottom;
					height: 31px;
					width: 31px;
					color: #fff;
					text-shadow: 0 0 8px #000;
					font-size: 16px;
				}

				> .follow {
					margin-left: 4px;
					vertical-align: bottom;
				}
			}

			> .title {
				position: absolute;
				bottom: 0;
				left: 0;
				width: 100%;
				padding: 0 0 8px 154px;
				box-sizing: border-box;
				color: #fff;

				@media (max-width: 500px) {
					display: none;
				}

				> .name {
					display: block;
					margin: 0;
					line-height: 32px;
					font-weight: bold;
					font-size: 1.8em;
					text-shadow: 0 0 8px #000;
				}

				> div {
					> * {
						display: inline-block;
						margin-right: 16px;
						line-height: 20px;
						opacity: 0.8;

						&.username {
							font-weight: bold;
						}
					}
				}
			}
		}

		> .title {
			display: none;
			text-align: center;
			padding: 50px 0 16px 0;
			font-weight: bold;
			border-bottom: solid 1px var(--divider);

			@media (max-width: 500px) {
				display: block;
			}
		}

		> .avatar {
			display: block;
			position: absolute;
			top: 170px;
			left: 16px;
			z-index: 2;
			width: 120px;
			height: 120px;
			box-shadow: 1px 1px 3px rgba(#000, 0.2);

			@media (max-width: 500px) {
				top: 90px;
				left: 0;
				right: 0;
				width: 92px;
				height: 92px;
				margin: auto;
			}
		}

		> .description {
			padding: 24px 24px 24px 154px;
			font-size: 15px;

			@media (max-width: 500px) {
				padding: 16px;
				text-align: center;
			}

			> .empty {
				margin: 0;
				opacity: 0.5;
			}
		}

		> .fields {
			padding: 24px;
			font-size: 14px;
			border-top: solid 1px var(--divider);

			@media (max-width: 500px) {
				padding: 16px;
			}
		
			> .field {
				display: flex;
				padding: 0;
				margin: 0;
				align-items: center;

				&:not(:last-child) {
					margin-bottom: 8px;
				}

				> .name {
					width: 30%;
					overflow: hidden;
					white-space: nowrap;
					text-overflow: ellipsis;
					font-weight: bold;
					text-align: center;
				}

				> .value {
					width: 70%;
					overflow: hidden;
					white-space: nowrap;
					text-overflow: ellipsis;
				}
			}
		}

		> .status {
			display: flex;
			padding: 24px;
			border-top: solid 1px var(--divider);

			@media (max-width: 500px) {
				padding: 16px;
			}

			> a {
				flex: 1;
				text-align: center;

				&.active {
					color: $primary;
				}

				&:hover {
					text-decoration: none;
				}

				> b {
					display: block;
					line-height: 16px;
				}

				> span {
					font-size: 70%;
				}
			}
		}
	}

	> .pins {
		> .note {
			margin-bottom: 16px;

			@media (max-width: 500px) {
				margin-bottom: 8px;
			}
		}
	}

	> * {
		max-width: 600px;
		margin: 0 auto;
	}
}
</style>
